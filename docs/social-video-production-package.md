# AURELIA Pro X1 — Social Video Production Package

> Ready-to-encode brief for the vault Video Studio pipeline
> (**ViMax** script→video · **short-from-brief** · **OpenCut** edit).
> This sandbox has no ffmpeg / no screen-capture, so this package IS the
> deliverable: feed it to ViMax/short-from-brief, or cut in OpenCut.
> All copy/brand/assets are the project's real, current values.

## 1. Spec

| | |
|---|---|
| Format | **9:16 vertical**, 1080×1920, H.264 high, 30 fps, ~8–12 Mbps |
| Duration | **28 s** (Reels/TikTok/Shorts sweet spot; sub-30s, loops) |
| Audio | Music bed only (the totem itself is silent by design — brief §5). −14 LUFS, ducked under no VO. Optional VO variant in §6. |
| Languages | Master = **IT**; **EN** + **SV** variants = same timeline, swap the on-screen text + end tagline (trivial re-encode in ViMax/OpenCut). Strings in §5. |
| Brand lock | bg `#0A0A0A`, copper `#B87333`, cream `#F5F1E8`. Type: **Cormorant Garamond** (display, titles), **Inter** (labels/benefit lines), **JetBrains Mono** (the "0N" index + specs). Aesthetic: "quiet museum / Italian atelier" — slow, no snap, no flashy transitions. See `DESIGN.md`. |
| Motion | We only have **stills** (no live capture possible here). Use slow Ken-Burns push-in / vertical parallax (4–6% scale over the shot, `ease-quiet` feel). NO whip-pans, NO zoom punches — it must read editorial, not advertorial. |

## 2. Narrative arc (28 s)

1. **Cold open (0–3s)** — black; copper hairline draws L→R; `AURELIA Pro X1` fades in (Cormorant), tagline under it. Hero render behind, very slow push-in.
2. **Hero statement (3–6s)** — full machine (front render), "Macchina espresso prosumer dual boiler · Made in Italy · €2.890". Establish the object.
3. **The 8 features (6–24s)** — 8 cards × ~2.25 s. Each: tight framing on the feature (render or detail photo), parallax push, `0N` mono index + feature name (Cormorant) + 1 benefit line (Inter). Copper accent only on the index/keyline (brand rule: copper sparing).
4. **Close (24–28s)** — back to hero 3⁄4 render, tagline reprise `Il caffè, scolpito.`, brand lockup, soft copper underline. End frame holds (loop-friendly).

## 3. Shotlist (mapped to REAL assets)

Repo-relative paths. Hero renders are 2000×1100 → for 9:16 crop to the
vertical centre / Ken-Burns; the machine is tall so it frames well.
Where a render doesn't isolate a feature, use the closest reference photo
in `public/foto 360 gradi/`.

| # | t (s) | Asset | Framing / motion | On-screen (IT) |
|---|------|-------|------------------|----------------|
| S1 | 0.0–3.0 | `assets/3d/coffee-machine/renders/render_front.png` | full, 1.00→1.05 push, dark vignette | `AURELIA Pro X1` / *Il caffè, scolpito.* |
| S2 | 3.0–6.0 | `render_3q_right.png` | 3⁄4 hero, slow drift | `Espresso prosumer dual boiler · Made in Italy · €2.890` |
| S3 | 6.0–8.25 | `public/foto 360 gradi/dettaglio frontale.png` (display area) | punch-in top panel | `01 · Display TFT 3,5"` / *Temperatura, pressione, profili — a colori.* |
| S4 | 8.25–10.5 | `public/foto 360 gradi/dettaglio frontale.png` (gauge) | tight on manometer | `02 · Manometro premium` / *Quadrante rame brunito, ghiera massiccia.* |
| S5 | 10.5–12.75 | `dettagli singoli.png` (buttons) | macro, copper keyline | `03 · Controlli capacitivi` / *Tre tasti retroilluminati, risposta tattile.* |
| S6 | 12.75–15.0 | `render_front.png` (group head crop) | push to group collar | `04 · Gruppo in rame` / *Erogatore 58 mm, collare rame brunito.* |
| S7 | 15.0–17.25 | `aurellia front.png` (portafilter) | tight on wood handle | `05 · Portafiltro 58 mm` / *Bottomless cromato, manico in noce.* |
| S8 | 17.25–19.5 | `render_side_right.png` (steam wand) | side, follow the wand curve | `06 · Lancia vapore in rame` / *Snodo 360°, curva ergonomica a S.* |
| S9 | 19.5–21.75 | `alto angolazione.png` (top) | top-down, parallax | `07 · Scaldatazze in acciaio` / *Maglia inox 304, calore passivo.* |
| S10 | 21.75–24.0 | `aurellia front.png` (base/tray) | low, tight on grate | `08 · Vasca + grata inox` / *Rimovibile, grata acciaio.* |
| S11 | 24.0–28.0 | `render_3q_left.png` | pull-back hero, hold last 1.5s (loop) | `AURELIA Pro X1` / *Il caffè, scolpito.* / [brand lockup] |

> Premium upgrade (optional, when live capture works): replace S3–S10
> with screen-recordings of the deployed totem actually opening each
> hotspot (attractor → tap pin → panel slide → next). Same timing/markers.
> See §7.

## 4. The 8 features — source of truth

Current `data/hotspots.json` order/ids (NOT the old brief numbering):

1. h1-display — Display TFT 3,5″ · 2. h2-gauge — Manometro analogico premium · 3. h3-buttons — Controlli capacitivi retroilluminati · 4. h4-group — Gruppo erogatore con collare in rame · 5. h5-portafilter — Portafiltro 58 mm con manico in noce · 6. h6-steam — Lancia vapore in rame articolata · 7. h7-warmer — Scaldatazze superiore in acciaio · 8. h8-tray — Vasca raccogli-gocce con grata in acciaio.

Full localized titles/descriptions/specs live in `messages/{it,en,sv}.json`
under `hotspot.{display,gauge,controls,group,portafilter,steam,warmer,drip}`
— the social benefit lines in §3/§5 are tightened from those (social ≠ UI copy).

## 5. Caption sheets (master + variants)

**Headline / tagline** (all langs share headline `AURELIA Pro X1`):
- IT tagline `Il caffè, scolpito.` · invite n/a (no CTA mid-roll)
- EN tagline `Espresso, sculpted.`
- SV tagline `Espresso, skulpterad.`

**Feature lines** — IT in §3. EN / SV (same order S3→S10):
- EN: `01 · 3.5" TFT display` *Temperature, pressure, profiles — in colour.* · `02 · Premium gauge` *Burnished-copper dial, solid bezel.* · `03 · Capacitive controls` *Three backlit keys, tactile response.* · `04 · Copper group head` *58 mm group, burnished-copper collar.* · `05 · 58 mm portafilter` *Bottomless chrome, walnut handle.* · `06 · Articulated copper wand` *360° joint, ergonomic S-curve.* · `07 · Steel cup warmer` *304 inox mesh, passive heat.* · `08 · Tray + steel grate` *Removable, stainless grate.*
- SV: `01 · 3,5" TFT-skärm` *Temperatur, tryck, profiler — i färg.* · `02 · Premium-manometer` *Brunerad kopparurtavla, massiv ring.* · `03 · Kapacitiva kontroller` *Tre bakgrundsbelysta knappar.* · `04 · Bryggrupp i koppar` *58 mm grupp, brunerad kopparkrage.* · `05 · 58 mm portafilter` *Bottenlös krom, valnötshandtag.* · `06 · Ledad ångpip i koppar` *360°-led, ergonomisk S-kurva.* · `07 · Koppvärmare i stål` *304 inox-nät, passiv värme.* · `08 · Droppbricka + stålgaller` *Avtagbar, rostfritt galler.*

Caption style: Cormorant 600 for the feature name, Inter 400 for the
benefit line, JetBrains Mono for `0N`. Lower third, safe-area ≥120 px from
edges (TikTok UI). Copper underline keyline only.

## 6. Music & optional VO
- **Music:** restrained, warm, slow ~70–85 BPM — felt-piano / upright bass / soft analog pad. NO EDM, NO trailer braams. References (mood, not licence): the "Italian atelier" of an Aesop/Berluti craft film. Sit at −18 to −20 LUFS under text beats, swell gently on S1 and S11.
- **Optional VO variant:** if a spoken cut is wanted, the vault `ebook2audiobook`/voice pipeline can read a 3-line script per language (headline, one umbrella benefit, tagline). Keep it ≤6 words/line, same calm register. Default deliverable = music-only.

## 7. Hand-off — how to actually encode this

**Path A — ViMax (agentic, recommended):** feed §2 (arc) + §3 (shotlist) +
§5 (captions) as the brief; asset manifest = the paths in §3 (copy the 4
renders + the listed `public/foto 360 gradi/` photos into ViMax's input
dir). Produce IT master, then EN/SV by swapping §5 text tracks.

**Path B — short-from-brief skill:** this whole file is the brief; point
it at the §8 manifest.

**Path C — OpenCut manual:** 11 clips per §3, durations as the table,
brand per §1, captions §5, music §6. Export §1 spec.

## 8. Asset manifest (exact, in-repo)

```
assets/3d/coffee-machine/renders/render_front.png        (2000x1100, hero)
assets/3d/coffee-machine/renders/render_3q_right.png
assets/3d/coffee-machine/renders/render_3q_left.png
assets/3d/coffee-machine/renders/render_side_right.png
public/foto 360 gradi/aurellia front.png                 (detail: portafilter/base)
public/foto 360 gradi/dettaglio frontale.png             (detail: display + gauge)
public/foto 360 gradi/dettagli singoli.png               (detail: buttons/parts)
public/foto 360 gradi/alto angolazione.png               (detail: cup warmer top)
```
Fonts: Cormorant Garamond, Inter, JetBrains Mono (Google Fonts — same as
the app). Brand colors §1. NOT for use: `renders/_live_*.png` (QA scratch),
`renders/render_side.png` (stale orphan).

## 9. Honest constraints / notes
- Source is **stills** (4 Cycles renders + photos) — no live UI motion was
  capturable here. The §7 "premium upgrade" (screen-rec the deployed
  totem) is the path to a true product-in-action cut; this package's
  timing/markers are built so those clips drop in 1:1.
- The 4 hero renders are landscape 2000×1100; 9:16 needs a vertical
  crop/Ken-Burns (machine is tall → works). For a flawless cut, a future
  pass could render the 4 views at native 1080×1920 via `render.py`
  (`AURELIA_RENDER_*` envs) — optional, not required for v1.

*Package by Claude Code, 2026-05-17. Real project data. Feeds the vault
Video Studio pipeline ([[🎬 Video Studio]] / ViMax / short-from-brief).*
