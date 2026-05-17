# ComfyUI-3D-Pack — valutazione per AURELIA Pro X1

> Repo: [MrForExample/ComfyUI-3D-Pack](https://github.com/MrForExample/ComfyUI-3D-Pack)
> MIT, 3744 ★, ultimo update 2026-05-14

## TL;DR

Game-changer **se** vuoi superare il limite "Meshy = mesh singola single-material"
del modello attuale `aurelia-v2.glb`. Il modulo killer è **PartCrafter** che
emette mesh **separate per parte** (body, group head, portafilter, gauge,
drip tray …) → finalmente possiamo tintare body in anthracite scuro **senza
toccare i copper accents** nel viewer R3F.

Costa 1–3h di setup + GPU 12 GB+ VRAM. Da considerare per la **prossima
iterazione**, non per la fiera imminente.

## Cosa porterebbe ad AURELIA

### 1. PartCrafter (single image → mesh con part segmentation)

- Input: 1 foto della macchina (es. `public/foto 360 gradi/aurellia front.png`)
- Output:
  - Full mesh assemblata
  - **ZIP con mesh individuali per parte**
- Nel viewer R3F potremmo finalmente:
  - `mat_body.color = (0.1, 0.09, 0.08)` → anthracite scuro
  - `mat_copper.color = (0.72, 0.45, 0.20)` → rame puro
  - `mat_walnut.color = (0.44, 0.30, 0.20)` → noce
  - **Indipendentemente uno dall'altro**
- Hotspot tornano a essere `anchor_node`-based: il click su "manometro" può
  selezionare la mesh `gauge_*` ed evidenziarla

### 2. Hunyuan3D-2.1 (image → PBR maps separati)

- Output: mesh + texture **separate** (basecolor + metallic + roughness +
  normal) invece di un atlas JPEG monolitico
- Materiali editabili a piacere senza re-bake
- Compatibile R3F via `MeshStandardMaterial` standard

### 3. MV-Adapter (mesh esistente → re-texturing)

- Input: il `aurelia-v2.glb` attuale + foto reference
- Output: stesso mesh, texture nuove più aderenti alle reference
- Costo zero di tempo geometria, refresha solo la skin

## Setup cost

| Voce | Costo |
|---|---|
| Installazione ComfyUI | 30 min, ~500 MB |
| `ComfyUI-3D-Pack` deps | 1h compile CUDA extensions, ~3 GB pip |
| Model weights (PartCrafter + Hunyuan3D-2.1 + MV-Adapter) | ~25 GB da HuggingFace |
| **GPU richiesta** | 12 GB+ VRAM (RTX 3060 12GB, 3080 Ti, 4070 Ti, 4080, 4090) |
| **Build tools** | Visual Studio Build Tools (Windows) per JIT C++ extensions |
| Tempo prima generazione utile | 1–3 ore |

## Confronto con Meshy cloud (corrente)

| Criterio | ComfyUI-3D-Pack (locale) | Meshy cloud |
|---|---|---|
| Setup iniziale | 1–3 ore | zero |
| Costo per generazione | €0 | ~30 crediti = €0.30 |
| Tempo wall-clock per generazione | 5–30 min (dipende da GPU) | 3–5 min |
| Part separation | ✅ PartCrafter | ❌ mesh singola |
| PBR maps separati | ✅ Hunyuan3D-2.1 | ❌ atlas baked |
| Privacy / offline | ✅ on-prem | ❌ cloud |
| Reliability | dipende da driver/VRAM | API SLA Meshy |
| Iterazioni libere | infinite | limitate al saldo crediti |

## Decisione consigliata

**Adesso (fiera imminente)**: continuiamo con Meshy. `aurelia-v2.glb`
post-fix-bbox dovrebbe già funzionare bene per il kiosk. Il modello è
single-mesh ma visivamente convincente.

**Quando si torna a iterare** (post-fiera, raffinamento materiali, demo
clienti più sofisticati):
1. Setup ComfyUI + ComfyUI-3D-Pack
2. Lancio PartCrafter su `aurellia front.png`
3. Import del ZIP di mesh separate
4. Refactor del `ProductViewer.tsx` per mappare ogni hotspot alla mesh
   corrispondente + tinting indipendente
5. (Opzionale) Hunyuan3D-2.1 per PBR maps perfettamente separati

## Pre-built alternativa Windows-friendly

Per saltare il compile da sorgente su Windows c'è
**[Comfy3D-WinPortable](https://github.com/YanWenKun/Comfy3D-WinPortable)**
di YanWenKun: pacchetto pre-buildato per Win10/11 + Python 3.12 + CUDA 12.4 +
torch 2.5.1+cu124. Risparmia il giro Visual Studio Build Tools.

## Specs hardware consigliata

Per girare comodamente PartCrafter + Hunyuan3D-2.1:
- **GPU**: NVIDIA RTX 3090 24GB / RTX 4080 16GB / RTX 4090 24GB
- **RAM**: 32 GB
- **Disco**: 50 GB liberi (modelli + cache)
- **Sistema**: Windows 11 / Linux Ubuntu 22.04 con drivers NVIDIA recenti
- Sistema **non** supportato: Mac (manca CUDA)
