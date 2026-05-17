"""
Meshy AI multi-image-to-3D for AURELIA Pro X1.

Uses the canonical 4 reference views in public/foto 360 gradi/:
  - aurellia front.png
  - aurelia back.png
  - aurelia left.png
  - aurelia right.png

Each PNG is resized to 1024×1024 and re-encoded as JPEG q85 to keep the
request body under ~3 MB total, then base64-encoded into the `image_urls`
array. Multi-image input gives the model direct visual evidence of the
anthracite/bronze body, walnut handle, copper accents, etc. — no more
"interpretive" champagne body from the text-only prompt.

Pipeline:
  1. POST /openapi/v1/multi-image-to-3d  (mesh + texture in one shot)
  2. Stream SSE until SUCCEEDED
  3. Download GLB to public/models/aurelia-v2.glb (overwrites previous v2)
"""
import base64
import io
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

import requests
from PIL import Image

API = "https://api.meshy.ai/openapi/v1/multi-image-to-3d"
ROOT = Path(__file__).resolve().parent.parent
PHOTOS_DIR = ROOT / "public" / "foto 360 gradi"
OUT_DIR = ROOT / "meshy_output"
PUBLIC_GLB = ROOT / "public" / "models" / "aurelia-v2.glb"

VIEWS = [
    "aurellia front.png",  # original spelling preserved
    "aurelia right.png",
    "aurelia back.png",
    "aurelia left.png",
]

TEXTURE_PROMPT = (
    "Brushed anthracite steel body with smoked-bronze PVD undertone visible "
    "on rounded edges. Brushed copper group head ring and pressure gauge "
    "bezel with concentric pattern. Polished copper steam wand tube, chrome "
    "tip. Walnut wood portafilter handle with contrasting grain, polished "
    "chrome ferrule. Stainless steel expanded-metal cup warmer on top, "
    "chevron drip tray grille. Matte black LCD, black silicone grip and "
    "rubber feet. Low specular satin finishes throughout."
)


def encode_image(path: Path, max_size: int = 1024, quality: int = 85) -> str:
    """Resize + JPEG-encode the PNG and return a base64 data URI."""
    img = Image.open(path).convert("RGB")
    w, h = img.size
    if max(w, h) > max_size:
        if w >= h:
            new_w = max_size
            new_h = int(h * max_size / w)
        else:
            new_h = max_size
            new_w = int(w * max_size / h)
        img = img.resize((new_w, new_h), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    print(f"  {path.name}: {w}×{h} → {img.size[0]}×{img.size[1]}, {len(buf.getvalue())//1024} KB", flush=True)
    return f"data:image/jpeg;base64,{b64}"


def post_task(payload):
    api_key = os.environ["MESHY_API_KEY"]
    r = requests.post(
        API,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=120,
    )
    if not r.ok:
        print(f"  [HTTP {r.status_code}] {r.text[:600]}", flush=True)
        r.raise_for_status()
    return r.json()["result"]


def stream_task(task_id):
    api_key = os.environ["MESHY_API_KEY"]
    print(f"\n  task_id={task_id}", flush=True)
    last_pct = -1
    while True:
        try:
            r = requests.get(
                f"{API}/{task_id}/stream",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Accept": "text/event-stream",
                },
                stream=True,
                timeout=600,
            )
            for line in r.iter_lines():
                if not line or not line.startswith(b"data:"):
                    continue
                try:
                    data = json.loads(line.decode("utf-8")[5:].strip())
                except Exception:
                    continue
                status = data.get("status")
                progress = data.get("progress", 0)
                if progress != last_pct:
                    print(f"  {status} {progress}%", flush=True)
                    last_pct = progress
                if status in ("SUCCEEDED", "FAILED", "CANCELED"):
                    r.close()
                    if status == "SUCCEEDED":
                        return data
                    err = (data.get("task_error") or {}).get("message", status)
                    raise SystemExit(f"  failed: {err}")
        except requests.exceptions.RequestException as e:
            print(f"  stream interrupted: {e}; retrying in 5s", flush=True)
            time.sleep(5)


def fetch_task(task_id):
    api_key = os.environ["MESHY_API_KEY"]
    r = requests.get(
        f"{API}/{task_id}",
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=60,
    )
    r.raise_for_status()
    return r.json()


def download(url, dest):
    print(f"  download {url[:80]}…", flush=True)
    with urllib.request.urlopen(url, timeout=180) as response:
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as f:
            while True:
                chunk = response.read(64 * 1024)
                if not chunk:
                    break
                f.write(chunk)
    size_mb = dest.stat().st_size / 1024 / 1024
    print(f"  saved {dest} ({size_mb:.2f} MB)", flush=True)


def main():
    if "MESHY_API_KEY" not in os.environ:
        sys.exit("MESHY_API_KEY missing in environment")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    project_dir = OUT_DIR / f"{timestamp}_aurelia_multiview"
    project_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60, flush=True)
    print("AURELIA Pro X1 — Meshy multi-image-to-3D pipeline", flush=True)
    print("=" * 60, flush=True)

    print("\n[1/3] Encoding 4 reference views…", flush=True)
    image_urls = []
    for name in VIEWS:
        path = PHOTOS_DIR / name
        if not path.exists():
            sys.exit(f"Missing reference photo: {path}")
        image_urls.append(encode_image(path))
    total_bytes = sum(len(u) for u in image_urls)
    print(f"  total payload (base64): {total_bytes // 1024} KB", flush=True)

    print("\n[2/3] Submitting multi-image-to-3D task…", flush=True)
    payload = {
        "image_urls": image_urls,
        "ai_model": "meshy-6",
        "topology": "triangle",
        "target_polycount": 50000,
        "should_remesh": True,
        "should_texture": True,
        "enable_pbr": True,
        "texture_prompt": TEXTURE_PROMPT,
        "symmetry_mode": "auto",
        "moderation": False,
    }
    task_id = post_task(payload)
    stream_task(task_id)

    print("\n[3/3] Downloading…", flush=True)
    final = fetch_task(task_id)

    # Backup current v2 if any
    if PUBLIC_GLB.exists():
        backup = PUBLIC_GLB.with_suffix(".prev.glb")
        PUBLIC_GLB.rename(backup)
        print(f"  previous v2 backed up to {backup.name}", flush=True)

    glb_url = final["model_urls"]["glb"]
    download(glb_url, project_dir / "aurelia.glb")
    download(glb_url, PUBLIC_GLB)

    if final.get("thumbnail_url"):
        try:
            download(final["thumbnail_url"], project_dir / "thumbnail.png")
        except Exception as e:
            print(f"  thumbnail skipped: {e}", flush=True)

    metadata = {
        "task_id": task_id,
        "views_used": VIEWS,
        "texture_prompt": TEXTURE_PROMPT,
        "model_urls": final.get("model_urls"),
        "texture_urls": final.get("texture_urls"),
        "thumbnail_url": final.get("thumbnail_url"),
        "created_at": final.get("created_at"),
        "finished_at": final.get("finished_at"),
    }
    (project_dir / "metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )

    print("\n" + "=" * 60, flush=True)
    print("DONE", flush=True)
    print(f"  public GLB : {PUBLIC_GLB.relative_to(ROOT)}", flush=True)
    print(f"  project dir: {project_dir.relative_to(ROOT)}", flush=True)
    print("=" * 60, flush=True)
    print("\nNext: run `node scripts/optimize-glb.mjs` to shrink ~38%.", flush=True)


if __name__ == "__main__":
    main()
