"""
Meshy AI text-to-3D pipeline for AURELIA Pro X1.

Reads the master prompt from docs/design-brief-2026-05-15.md, fires:
  1. /openapi/v2/text-to-3d  (preview)  → ~5 cr, ~50 s
  2. /openapi/v2/text-to-3d  (refine)   → +25 cr, ~3-5 min   (PBR texture pass)
Streams progress via SSE on both stages. Downloads final GLB into
public/models/ and writes metadata sidecar into meshy_output/.

Pass MESHY_API_KEY in the environment. Pass an optional --resume <task_id>
flag to skip preview and re-run only the refine step on an existing task.
"""
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

import requests

API = "https://api.meshy.ai/openapi/v2/text-to-3d"
ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "meshy_output"
PUBLIC_GLB = ROOT / "public" / "models" / "aurelia-v2.glb"

PROMPT = (
    "Premium Italian dual-boiler espresso machine, tall rectangular prosumer body. "
    "Brushed anthracite steel, PVD bronze-black, warm copper undertone, micro-grain. "
    "R15mm top fillets, flat top with chrome cup-warmer grille. "
    "Thick brushed copper group head ring front-center, protruding. "
    "Polished chrome E61 portafilter with walnut teardrop handle. "
    "Pressure gauge top-right, brushed copper bezel, champagne dial. "
    "Flush matte black LCD top-left, three capacitive buttons below. "
    "Chromed S-curve steam wand right, black silicone grip. "
    "Stainless drip tray base, chevron grille, hex screws. "
    "Industrial luxury minimalism, La Marzocco Linea Mini proportions. "
    "Studio product photography, no text no logo."
)
assert len(PROMPT) <= 800, f"prompt too long: {len(PROMPT)} chars"

NEGATIVE = (
    "blurry, low quality, low poly, smooth plastic, glossy plastic, cartoon, toy, "
    "wireframe, debug, deformed, text, watermark, logo, label, brand, distorted "
    "proportions, cheap, mass-market, single-boiler, espresso pot, moka, drip "
    "coffee maker, automatic bean-to-cup"
)

TEXTURE_PROMPT = (
    "Brushed anthracite steel body with PVD bronze-black finish, micro-grain "
    "brushed texture, satin gunmetal, warm copper undertone. Brushed copper group "
    "head ring and pressure gauge bezel, concentric brush pattern. Polished chrome "
    "portafilter and steam wand. Walnut wood portafilter handle. Matte black "
    "rubberized buttons and silicone steam wand grip. Champagne paper dial on the "
    "pressure gauge. Matte black LCD glass. Stainless steel drip tray grille."
)


def post_task(payload):
    api_key = os.environ["MESHY_API_KEY"]
    r = requests.post(
        API,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json=payload,
        timeout=60,
    )
    if not r.ok:
        print(f"  [HTTP {r.status_code}] payload sent:", flush=True)
        print(f"    {json.dumps(payload, indent=2)[:1000]}", flush=True)
        print(f"  response: {r.text[:1000]}", flush=True)
        r.raise_for_status()
    return r.json()["result"]


def stream_task(task_id, label):
    api_key = os.environ["MESHY_API_KEY"]
    print(f"\n[{label}] task_id={task_id}", flush=True)
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
                if not line:
                    continue
                if not line.startswith(b"data:"):
                    continue
                try:
                    data = json.loads(line.decode("utf-8")[5:].strip())
                except Exception:
                    continue
                status = data.get("status")
                progress = data.get("progress", 0)
                if progress != last_pct:
                    print(f"  [{label}] {status} {progress}%", flush=True)
                    last_pct = progress
                if status in ("SUCCEEDED", "FAILED", "CANCELED"):
                    r.close()
                    if status == "SUCCEEDED":
                        return data
                    err = (data.get("task_error") or {}).get("message", status)
                    raise SystemExit(f"[{label}] failed: {err}")
        except requests.exceptions.RequestException as e:
            print(f"  [{label}] stream interrupted: {e}; retrying in 5s", flush=True)
            time.sleep(5)
        except Exception as e:
            raise


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
    with urllib.request.urlopen(url, timeout=120) as response:
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
    project_dir = OUT_DIR / f"{timestamp}_aurelia"
    project_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60, flush=True)
    print("AURELIA Pro X1 — Meshy text-to-3D pipeline", flush=True)
    print("=" * 60, flush=True)

    # ── Preview ──────────────────────────────────────────────────────────
    print("\n[1/2] Preview task", flush=True)
    preview_payload = {
        "mode": "preview",
        "prompt": PROMPT,
        "negative_prompt": NEGATIVE,
        "art_style": "realistic",
        "ai_model": "latest",
        "topology": "triangle",
        "target_polycount": 40000,
        "symmetry_mode": "off",
    }
    print(f"  prompt: {PROMPT[:120]}…", flush=True)
    preview_id = post_task(preview_payload)
    stream_task(preview_id, "preview")

    # ── Refine (PBR texture pass) ────────────────────────────────────────
    print("\n[2/2] Refine task (PBR textures)", flush=True)
    refine_payload = {
        "mode": "refine",
        "preview_task_id": preview_id,
        "texture_prompt": TEXTURE_PROMPT,
        "enable_pbr": True,
        "ai_model": "latest",
    }
    refine_id = post_task(refine_payload)
    stream_task(refine_id, "refine")

    # ── Final fetch + download ───────────────────────────────────────────
    final = fetch_task(refine_id)
    glb_url = final["model_urls"]["glb"]
    metadata = {
        "preview_task_id": preview_id,
        "refine_task_id": refine_id,
        "prompt": PROMPT,
        "negative_prompt": NEGATIVE,
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
    print(f"\nMetadata → {project_dir / 'metadata.json'}", flush=True)

    download(glb_url, project_dir / "aurelia.glb")
    download(glb_url, PUBLIC_GLB)

    if final.get("thumbnail_url"):
        try:
            download(final["thumbnail_url"], project_dir / "thumbnail.png")
        except Exception as e:
            print(f"  thumbnail download skipped: {e}", flush=True)

    print("\n" + "=" * 60, flush=True)
    print("DONE", flush=True)
    print(f"  public GLB : {PUBLIC_GLB.relative_to(ROOT)}", flush=True)
    print(f"  project dir: {project_dir.relative_to(ROOT)}", flush=True)
    print("=" * 60, flush=True)


if __name__ == "__main__":
    main()
