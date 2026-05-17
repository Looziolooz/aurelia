# 07 — Material Upgrade Strategies (Strada A vs B vs C vs Z)

> Documento di supporto per portare il modello dal grigio plastico iniziale
> all'aspetto premium della reference (acciaio + rame + noce + cromo).
> Storico decisionale FASE 3.5 (post-FASE 3, pre-FASE 4 finale).

---

## Stato attuale (post-Opzione Z)

✅ Next.js + i18n IT/EN/SV su `localhost:3000`
✅ Modello 3D AURELIA caricato in `<model-viewer>` con HDR studio
✅ 8 hotspot posizionati e visibili
✅ Tipografia brand (Cormorant + Inter) corretta
✅ Layout dark con vignettatura, header "MADE IN ITALY"
✅ Footer disclaimer multilingua
✅ **Multi-material PBR per altezza** applicato via `scripts/multi-material-by-height.mjs`

**Status: ~85% del prototipo. Geometria limitata da TRELLIS single-image è il restante gap.**

---

## Diagnosi del gap (riferimento per future iteration)

Confrontando con la foto reference, ci sono **due gap distinti** che richiedono soluzioni diverse:

### GAP 1 — Materiali (risolto in parte da Opzione Z)

| Reference | Modello attuale (post-Z) | Stato |
|---|---|---|
| Body charcoal opaco | charcoal applicato per altezza | ✅ Risolto |
| Frontale acciaio spazzolato | brushed steel banda 16-50% | ✅ Risolto |
| Strisce orizzontali rame | copper banda 92-100% (top edge) | 🟡 Parziale (no strisce intermedie) |
| Manico portafiltro in noce | NON distinguibile per altezza | ❌ Non risolto (richiede Blender manuale) |
| Cromo specchio sui dettagli | chrome banda 10-16% (drip tray) | 🟡 Parziale |
| Plastica nera opaca manopole | rubber banda 0-4% (piedini) | 🟡 Solo piedini |
| Smalto bianco quadranti | NON distinguibile | ❌ Non risolto |

### GAP 2 — Geometria (non risolvibile dipingendo)

| Reference | Modello attuale | Mitigation |
|---|---|---|
| 2 manometri analogici tondi | 1 cerchio liscio piatto | Strada A (rigenera con reference HD) |
| File di 6+ manopole nere | Nessuna manopola | Strada A o modeling Blender (4-8h) |
| Display PID strutturato con cornice | Rettangolo piatto | Strada A |
| Gruppo E61 con scanalature | Cilindro liscio | Strada A |
| Drip tray con grata | Superficie liscia | Strada A o Blender modifier |
| Strisce copper rilevate | Nessun rilievo | Strada A |
| Lancia vapore articolata | Tubo dritto | Strada A |

**Punto chiave**: la pre-assegnazione automatica per altezza (Opzione Z) risolve il Gap 1 superficialmente. Per perfezione brand-fedele serve Strada A (rigenerazione AI con reference) o Strada B (Blender manuale).

---

## STRADA A — Rigenerazione AI con reference (raccomandata se hardware OK)

**Tempo**: ~15 minuti totali
**Risultato atteso**: 7-8/10 di fedeltà alla reference, geometria + materiali
**Costo**: zero
**Requisiti**: NVIDIA GPU 12GB+ VRAM, ComfyUI installato, custom node TRELLIS2

### Procedura

1. **Salva la foto reference** come `assets/refs/aurelia-reference.jpg`
   (1024×1024 quadrata ideale, padding bianco se non quadrata)

2. **Setup ComfyUI + TRELLIS2** (se non già fatto):

   ```powershell
   cd C:\Users\loren\Desktop\dev-tools\ComfyUI\custom_nodes
   git clone https://github.com/PozzettiAndrea/ComfyUI-TRELLIS2.git
   cd ..
   .\venv\Scripts\Activate.ps1
   pip install -r custom_nodes\ComfyUI-TRELLIS2\requirements.txt
   ```

3. **Workflow base** (1 nodo TRELLIS Image to 3D + Save GLB):
   - Image: `aurelia-reference.jpg`
   - Resolution: 512 (sicuro su 12GB con `--lowvram`)
   - Steps: 25
   - Texture: enabled ⭐
   - PBR: enabled ⭐

4. **Genera** (~30-60s su 3060+ con fp16) → `aurelia-trellis.glb`

5. **Ottimizza per il web**:

   ```bash
   bunx --bun @gltf-transform/cli optimize \
     C:\percorso\aurelia-trellis.glb \
     public/models/aurelia-prox1.glb \
     --texture-compress webp --texture-size 2048 \
     --compress draco
   ```

6. **Ricalibra hotspot** su https://modelviewer.dev/editor/ → aggiorna `data/hotspots.json`

7. **Refresh** browser → modello con materiali e geometria fedeli alla reference

### Alternativa Hunyuan3D-2 (Apache 2.0, EU commercial limit)

⚠️ Hunyuan3D ha clausola EU/UK/Korea che blocca uso commerciale. Per R&D personale OK, per deliverable cliente EU NO. Vedi `04-Riferimenti.md` per dettagli license.

```powershell
git clone https://github.com/Tencent/Hunyuan3D-2.git
cd Hunyuan3D-2
pip install -r requirements.txt
python gradio_app.py
```

---

## STRADA B — Script Blender (rifinitura manuale)

**Tempo**: 30-90 minuti (curva apprendimento Blender inclusa)
**Risultato atteso**: 5-6/10 di fedeltà (limitato dalla geometria attuale)
**Quando usarla**: dopo Strada A per rifinire i 2-3 dettagli che TRELLIS sbaglia
**Requisiti**: Blender 4.x installato (gratuito, no login)

### Cosa fa lo script `scripts/aurelia-multi-material.py`

Già committed nel progetto. Crea 9 materiali PBR brand-coerenti:
- Body charcoal opaco
- Body warm dark
- Acciaio spazzolato (con anisotropia procedurale)
- Rame brunito (#B87333)
- Cromo specchio
- Noce italiano (procedurale, zero texture esterne)
- Gomma nera opaca
- Smalto bianco caldo
- Display glow (emissive copper-toned)

Include pannello laterale "AURELIA" in Blender 3D View per assegnazione manuale via Edit Mode → Face Select.

### Procedura Blender (sintesi)

1. Installa Blender 4.x da https://www.blender.org/download/
2. Apri Blender → cancella scena default (`A` poi `X`)
3. `File → Import → glTF 2.0` → seleziona `public/models/aurelia-prox1.glb`
4. Tab **Scripting** → Open → seleziona `scripts/aurelia-multi-material.py` → ▶ Run Script
5. Verifica console: `[AURELIA] ✓ Setup completato.`
6. Tab **Layout** → premi `N` nel viewport → tab **AURELIA** appare
7. Tab → Edit Mode → `3` per Face Select
8. Seleziona facce con `L` (linked), `B` (box), `Shift+click` (additive)
9. Click sul materiale nel pannello AURELIA → applicato
10. Quando soddisfatto: Object Mode → click "Export Optimized GLB"
11. Sostituisci in `public/models/aurelia-prox1.glb`

### Ordine consigliato di applicazione manuale

1. **Cromo specchio** → portafiltro, lancia vapore, ghiere
2. **Noce italiano** → solo manico del portafiltro
3. **Rame brunito** → strisce orizzontali, bordi top
4. **Acciaio spazzolato** → pannello frontale (zona display+gauge)
5. **Body charcoal** → tutto il resto (pannelli laterali, top, retro)
6. **Gomma nera** → piedini, eventuali manopole
7. **Smalto bianco** → facce piatte dei quadranti analogici
8. **Display glow** → faccia frontale del display

### Hotkeys Blender essenziali

| Tasto | Azione |
|---|---|
| `Tab` | Toggle Object/Edit Mode |
| `1` `2` `3` | Vertex / Edge / Face select |
| `A` / `Alt+A` | Select all / Deselect all |
| `L` | Select linked (sotto cursore) |
| `B` / `C` | Box / Circle select |
| `Z` | Shading mode menu (Solid/Material/Rendered) |
| `N` / `T` | Toggle sidebar / toolbar |
| Numpad `1`/`3`/`7` | Front / Side / Top view |
| Middle mouse / Shift+M | Orbit / Pan |
| Wheel | Zoom |

---

## STRADA C — Combinata (workflow realistic)

Pipeline ottimale se hai hardware:

1. **Strada A** — rigenera il GLB con TRELLIS+reference (15 min, salto qualità grosso)
2. **Strada B selettiva** — apri nuovo GLB in Blender, correggi solo 2-3 dettagli che TRELLIS sbaglia (10-20 min). NON riapplichi tutti i 9 materiali.
3. Export e sostituzione

Risultato realistico: **~7.5/10 di fedeltà**, ~30-40 minuti di lavoro.

---

## OPZIONE Z — Auto-tag per altezza in Node (APPLICATA)

**Tempo**: 0 minuti (eseguita automaticamente)
**Risultato**: 4-5/10 di fedeltà brand-coherent (limitato dalla geometria + assignment per altezza)
**Costo**: zero
**Requisiti**: zero (no Blender, no ComfyUI, no GPU)

### Cosa fa `scripts/multi-material-by-height.mjs`

Replica la logica `auto_tag_by_regions` (PHASE 3 dello script Blender) in JavaScript con `@gltf-transform`:

1. Carica GLB raw (TRELLIS single-mesh single-material)
2. Smooth normals + mikktspace tangents PRIMA dello split (coerenza shading)
3. Identifica asse "up" via max range bounding box (Z per TRELLIS GLB attuale)
4. Sorta 21.982 triangoli in 5 bande verticali:
   - 0-4% → **rubber** (gomma piedini) — 1.935 tri
   - 4-10% + 50-92% → **body** (charcoal corpo) — 13.674 tri
   - 10-16% → **chrome** (cromo drip tray) — 832 tri
   - 16-50% → **brushed steel** (acciaio frontale) — 5.002 tri
   - 92-100% → **copper** (rame top edge) — 539 tri
5. Splitta primitive originale in 5 nuove primitives (1 per material)
6. Assegna PBR brand AURELIA a ognuna
7. Save → optimize Draco

### Run

```bash
bun scripts/multi-material-by-height.mjs
bunx --bun @gltf-transform/cli optimize \
  assets/raw/aurelia-prox1-multimat.glb \
  public/models/aurelia-prox1.glb \
  --compress draco
```

### Output

`public/models/aurelia-prox1.glb` — **98 KB** Draco-compressed con 5 PBR materials brand pre-assegnati per altezza.

### Limitazioni Opzione Z (vs Strada B Blender manuale)

❌ **Per banda orizzontale uniforme** — il manico del portafiltro che dovrebbe essere noce non viene distinto se è alla stessa altezza del frontale steel
❌ **No walnut** — richiederebbe sapere "quali facce sono manico", impossibile da banda orizzontale
❌ **No display emissive glow** — richiederebbe distinguere geometricamente il display
❌ **Bande arbitrary** — 16-50% steel è una stima media, non corrisponde esattamente al pannello frontale di OGNI macchina

✅ **Trade-off positivo**: zero installazioni, riproducibile, scriptato, GLB 98 KB, multi-material visibile, riflessi PBR realistici sull'HDR.

---

## Cosa NON fare (lessons learned)

❌ **Non perdere ore in Blender prima di Strada A**: dipingere materiali perfettamente sulla geometria attuale (semplificata da TRELLIS single-image) dà risultato mediocre per molto sforzo. La geometria è il limite, non i materiali.

❌ **Non cercare di modellare i dettagli mancanti** (manometri, manopole, ecc): è lavoro di 4-8 ore di Blender modeling. Non vale per un prototipo — meglio rigenerare con TRELLIS HD.

❌ **Non rifinire le calibrazioni hotspot prima di aver finalizzato il GLB**: ogni volta che cambi modello le posizioni cambiano. Calibra solo alla fine.

---

## Quando fermarsi (criterio decisionale)

Per un **prototipo** da presentare al cliente, **5-7/10 di fedeltà è sufficiente**.

Il cliente vede e nota:
- ✅ Branding AURELIA coerente
- ✅ Modello 3D ruotabile e zoomabile
- ✅ 8 hotspot informativi cliccabili
- ✅ Tre lingue (IT/EN/SV)
- ✅ Idle attractor mode
- 🟡 Materiali distinguibili (Opzione Z risolve parzialmente, Strada A risolve)

Quello che il cliente NON nota in un prototipo:
- Se il rame è leggermente troppo chiaro o scuro
- Se le venature del legno sono procedurali invece che fotorealistiche
- Se ci sono 6 o 4 manopole

**Investi tempo nei deliverable di alto valore**: animazione attractor GSAP fluida, transizioni hotspot eleganti, comportamento touch impeccabile. Quelli sono i veri "wow factor" del kiosk.

---

## Decisione applicata in questo progetto

**Stato**: Opzione Z applicata (`scripts/multi-material-by-height.mjs`).

**Motivazione**: Lorenzo non ha account ComfyUI/TRELLIS2 setup, no Blender installato, no Sketchfab account. La pipeline node-only era l'unica fattibile in questa sessione senza dipendenze esterne. Il risultato 4-5/10 è sufficiente per il **test prototipo** (l'obiettivo dichiarato).

**Future iteration possibile** (post-prototipo, pre-demo cliente paid):
1. Lorenzo installa ComfyUI + TRELLIS2 + GPU 12GB+ → Strada A rigenera con HD reference
2. Optional: installa Blender + apre `scripts/aurelia-multi-material.py` → Strada B rifinitura selettiva (10-20 min)

---

*Documento creato 2026-04-27. Storico decisionale FASE 3.5.*
