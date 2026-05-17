# Migration plan: pipeline `coffee_machine_gen.py` → skill `/cad`

> **Stato:** proposta. Non implementare prima della prossima iterazione.

## Cosa cambia

Oggi la pipeline 3D è una catena di 4 script Python + 1 PowerShell mantenuta a
mano in [assets/3d/coffee-machine/scripts/](../assets/3d/coffee-machine/scripts/):

```
build123d  →  STEP  →  Blender (procedural materials)  →  Bake PBR  →  GLB
└─ coffee_machine_gen.py
   └─ generate_mesh_data.py
      └─ step_to_glb.py
         └─ bake.py
            └─ render.py
```

La skill [`/cad`](../../../text-to-cad/skills/cad/SKILL.md) (`earthtojake/text-to-cad`,
clonata in `lorenzovault/text-to-cad/`) sostituisce **i primi 2 stage** con:

```
python scripts/step coffee_machine_gen.py
python scripts/inspect ...
python scripts/render ...
```

con `@cad[part:label]` references stabili per riferirsi a singoli sub-componenti
da prompt naturale, validazione facts / planes / measurements automatica e
handoff a CAD Explorer per review visuale.

## Vantaggi concreti per AURELIA

| Pain attuale | Risolto da `/cad` |
|---|---|
| `coffee_machine_gen.py` riscritto a mano | brief in linguaggio naturale → build123d generato e validato |
| `generate_mesh_data.py` separato (problema serializzazione build123d↔Blender) | la skill produce STEP direttamente; Blender legge STEP, non JSON |
| Hotspot calibrati a mano dopo ogni rigenerazione | `@cad[gauge_rim].center` è un riferimento testuale stabile riusabile in [data/hotspots.json](../data/hotspots.json) e nel viewer |
| Bbox cambia silenziosamente | `scripts/inspect facts` confronta delta bbox e annota i parts spostati |
| Materiali procedural mai validati visivamente | `cad-explorer` apre i parts in browser locale per controllo veloce |
| Bake.py + step_to_glb.py mantenuti a mano | restano (la skill non bakka texture), ma partono da una STEP già validata |

## Cosa **non** sostituisce

- Il **bake PBR** in Blender ([bake.py](../assets/3d/coffee-machine/scripts/bake.py))
  rimane. La skill `/cad` produce STEP/STL/GLB *geometry-only*. Il workflow
  resta `cad-skill produces STEP → bake.py imports STEP → bake PBR → GLB
  texturizzata`.
- La generazione delle texture procedural (rame spazzolato, legno walnut, ecc.):
  rimane in [step_to_glb.py](../assets/3d/coffee-machine/scripts/step_to_glb.py)
  perché è una mappa group→procedural Blender, non geometria.
- L'integrazione R3F nel viewer.

## Path proposto (3 step)

### Step 1 — Adottare il launcher `/cad` per la STEP

Sostituire l'invocazione manuale di `coffee_machine_gen.py`:

```diff
- python "$PSScriptRoot\generate_mesh_data.py"
+ python /path/to/lorenzovault/text-to-cad/skills/cad/scripts/step \
+   assets/3d/coffee-machine/coffee_machine_gen.py \
+   --label coffee_machine \
+   --validate facts,planes
```

La skill:
1. Esegue `gen_step()` con il logging strutturato
2. Valida che il compound contenga solidi chiusi a volume positivo
3. Emette `assets/3d/coffee-machine/coffee_machine.step` + `*.facts.json`
4. Se richiesto, esporta anche `*.glb` raw per anteprima Explorer

Rimuovere `generate_mesh_data.py` (la skill tessella internamente per Blender).

### Step 2 — Hotspot via `@cad` reference invece di coordinate

Oggi [hotspots.json](../data/hotspots.json) usa `fallback_position` numerici che si
disallineano ogni volta che il modello cambia (problema B-3 del report).

Con `/cad`:

```jsonc
{
  "id": "h2-gauge",
  "anchor": "@cad[gauge_rim].center",
  "normal": "@cad[gauge_rim].axis",
  "i18nKey": "hotspot.gauge"
}
```

Lo script di build risolve i riferimenti contro il `facts.json` emesso da
`scripts/inspect` e scrive `data/hotspots.runtime.json` con le coordinate
correnti. `recalibrate-hotspots.mjs` diventa parte del build, non un workaround.

### Step 3 — Validazione bbox in CI

Aggiungere a `package.json` uno script `validate:cad` che:

```bash
python text-to-cad/skills/cad/scripts/inspect facts \
  assets/3d/coffee-machine/coffee_machine.step \
  --bbox-baseline docs/bbox-baseline.json \
  --tolerance 0.02
```

Esce con codice ≠0 se la bbox cambia oltre il 2% — gate per evitare il sync
silente che ha causato B-3.

## Costi & rischi

- **Dipendenza esterna**: `text-to-cad` è MIT, cloned-not-vendored. In caso di
  upstream breaking changes serve pin di una commit specifica.
- **Setup per developer**: la skill richiede l'installer dello `scripts/step`
  launcher nel `PATH`. Documentare in `OPENCODE.md`.
- **Curva di apprendimento**: i `@cad[...]` reference sono nuovi; il pattern è
  spiegato in `text-to-cad/skills/cad/references/inspection-and-validation.md`.
- **Niente bake automatico**: la skill non sostituisce `bake.py`. Confermato.

## Decisione richiesta

Procedere con Step 1 (solo launcher) in un branch separato per validare che
l'output STEP sia byte-identico a quello attuale e non rompa i bake successivi.
Step 2 e 3 sono opzionali e indipendenti.

## Risorse skill ausiliarie già disponibili nel vault

- [`/cad-explorer`](../../../text-to-cad/skills/cad-explorer/) — viewer locale
  Three.js per `.step/.stl/.3mf/.dxf/.urdf/.srdf/.sdf`. Utile per review
  prototipi senza aprire Blender.
- [`/step-parts`](../../../text-to-cad/skills/step-parts/) — catalogo standard
  parts (viti, manopole, raccordi) per importare componenti commerciali invece
  di modellarli da zero.
- [`/blender-asset-from-prompt`](../../../.claude/skills/blender-asset-from-prompt/)
  — pipeline parallela via `blender-mcp` per asset hero generati da prompt
  (utile per landing pages cliente, non per il totem core).
