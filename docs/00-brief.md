# 00 — Brief: AURELIA Pro X1 Totem Digitale Fiera

> Documento di brief originale del progetto. Source of truth per tutti i deliverable a valle (UX, UI, codice, copy, test).
> **Locked**: non modificare senza consenso esplicito di Lorenzo.

---

## 1. Decisioni progetto (locked)

| Domanda | Risposta scelta |
|---|---|
| **Hardware target** | Web responsive — primario: **iPad Pro 12.9" portrait** (touch). Fallback: Windows touch kiosk landscape + browser pubblico desktop. |
| **Risoluzione + orientation** | **1080×1920 portrait** (totem verticale standard fiera). Breakpoint secondari: 1920×1080 landscape, 2048×2732 (iPad nativo). |
| **Lingue** | **3 lingue**: Italiano (default), English, Svenska. i18n con `next-intl`. Language picker globale in header. |
| **Asset prodotto** | **Inventati per il prototipo**. Modello 3D `.glb` da generare con **Tripo AI**. Fallback: cubo placeholder con texture brand. |
| **Brand guidelines** | Brand fittizio **AURELIA** (vedi sezione 2.3). |
| **Tier** | **€6k-10k — 3D model-viewer tier**. Singolo modello ruotabile/zoomabile + 8 hotspot + idle attractor + 3 lingue. |

---

## 2. Prodotto: AURELIA Pro X1

### 2.1 Identità del prodotto

- **Nome**: AURELIA Pro X1
- **Categoria**: Macchina espresso prosumer dual boiler
- **Posizionamento**: Premium domestico / piccola caffetteria
- **Prezzo retail**: €2.890
- **Origine**: Made in Italy (storia: brand artigianale lombardo)
- **Tagline IT**: *"Il caffè, scolpito."*
- **Tagline EN**: *"Espresso, sculpted."*
- **Tagline SV**: *"Espresso, skulpterad."*

### 2.2 Specifiche fisiche

- **Dimensioni**: 350 × 400 × 450 mm (L × A × P)
- **Peso**: 18 kg
- **Materiali**: acciaio inox AISI 316 spazzolato, dettagli in **rame brunito**, inserti in **noce nazionale**
- **Colore body**: nero opaco con accenti rame
- **Alimentazione**: 230V / 1700W
- **Connessione idrica**: serbatoio 3L estraibile o allaccio diretto

### 2.3 Brand identity

**Palette colori**

| Colore | Hex | Uso |
|---|---|---|
| Nero profondo | `#0A0A0A` | background primario |
| Rame brunito | `#B87333` | accent / hotspot attivi |
| Crema avorio | `#F5F1E8` | testi / contrasto |
| Bianco puro | `#FFFFFF` | highlight |
| Grigio caldo | `#2A2622` | surface secondaria |

**Typography**

- Display: **Cormorant Garamond** (700, 600) — titoli prodotto
- UI/Body: **Inter** (400, 500, 600) — interfaccia, infografiche
- Mono: **JetBrains Mono** — specifiche tecniche numeriche

**Tone of voice**

| Lingua | Vibe |
|---|---|
| Italiano | Elegante, artigianale, evocativo. Frasi brevi. |
| English | Refined, crafted, confident. Short sentences. |
| Svenska | Stilren, hantverksmässig, lugn. Korta meningar. |

**Logo**

Wordmark "AURELIA" in Cormorant Garamond 700, letter-spacing 0.15em, sotto microtagline "PRO X1" in Inter 500 spaced.

---

## 3. Gli 8 hotspot interattivi

Ogni hotspot è un pin cliccabile sul modello 3D che apre un pannello laterale (slide-in da destra in portrait, da basso in landscape) con infografica.

| # | ID | Hotspot | Posizione 3D (approx) | Titolo IT | Highlight tecnico |
|---|---|---|---|---|---|
| 1 | `h1-boiler` | Caldaia dual boiler | retro-superiore | Doppia caldaia AISI 316 | PID indipendenti caffè (93°C) / vapore (123°C) |
| 2 | `h2-group` | Gruppo E61 | frontale-centro | Gruppo E61 a saturazione | Pre-infusione naturale, 2.3 kg massa termica |
| 3 | `h3-display` | Display PID 4" | frontale-superiore | Display touch PID | 4 profili pre-impostati, timer shot, allarme manutenzione |
| 4 | `h4-steam` | Lancia vapore | laterale-destra | Lancia vapore Pro | 4 fori, articolazione 360°, superficie cool-touch |
| 5 | `h5-portafilter` | Portafiltro 58mm | frontale-basso | Portafiltro bottomless | 58 mm cromato, manico in noce, peso 580g |
| 6 | `h6-pump` | Pompa rotativa | base-interno | Pompa rotativa Procon | 9 bar costanti, rumore <60dB, durata 50.000 cicli |
| 7 | `h7-tank` | Serbatoio acqua | retro-inferiore | Serbatoio 3L + rete | Estraibile dall'alto, sensore livello, allaccio fisso |
| 8 | `h8-gauge` | Manometro analogico | frontale-superiore-dx | Manometro premium | Backup analogico, scala 0-15 bar, vetro zaffiro |

---

## 4. Stack tecnico (locked)

```
Framework:        Next.js 15 (App Router) + React 19
Linguaggio:       TypeScript strict
Styling:          Tailwind CSS 4 + design tokens custom
3D engine:        @google/model-viewer (web component, NO R3F)
Animation:        GSAP 3 + @gsap/react
i18n:             next-intl
State (UI):       Zustand
Testing:          Playwright (touch emulation)
Build/dev:        Bun 1.3.x
Package manager:  Bun
```

**Perché `model-viewer` invece di React Three Fiber?**
Per il tier €6k-10k è la scelta corretta: hotspot dichiarativi nativi, AR support out-of-the-box, ~150KB gz, zero shader custom da scrivere. R3F è riservato al tier €12k-20k (configuratore, physics, post-processing).

---

## 5. Vincoli UX (per FASE 1)

- **Audience**: visitatori fiera B2B+B2C, sosta media 15-45 secondi
- **No scroll verticale**: tutto in viewport
- **Gesture limitati**: tap singolo, swipe orizzontale, pinch zoom, double-tap reset
- **No testo lungo**: decisione visiva in <3 secondi
- **Distanza lettura**: 1.2m → font min 18px body, 32px headlines
- **Touch target**: min 56px (iPad Pro tap accuracy)
- **Idle reset**: 60s no-touch → fade ad attractor mode
- **No audio** (fiera è ambiente rumoroso, no headphones)
- **Lingua reset**: 60s no-touch → ritorno a IT default

---

## 6. Acceptance criteria prototipo (definition of done)

- [ ] Modello 3D si carica in <2s su iPad (4G throttling)
- [ ] Tutti gli 8 hotspot cliccabili e mostrano contenuto corretto
- [ ] Cambio lingua istantaneo (no flicker)
- [ ] Attractor parte dopo 60s inattività in tutti gli stati
- [ ] Pinch zoom limitato (min 0.6m, max 2.5m camera distance)
- [ ] Double-tap area vuota = reset camera
- [ ] Nessun errore console in produzione
- [ ] Lighthouse mobile ≥ 90 Performance, 100 A11y, 100 Best Practices
- [ ] Funziona offline dopo primo caricamento (PWA cache)
- [ ] 12 ore continuative senza memory leak
- [ ] Funziona su Safari iPad, Chrome Windows touch, Edge kiosk

---

## 7. Workflow fasi (sintesi)

1. **FASE 1** — UX architecture → `docs/01-ux-architecture.md`
2. **FASE 2** — UI design tokens → `tailwind.config.ts` + `docs/02-ui-design-system.md`
3. **FASE 3** — Asset 3D Tripo AI → `public/models/aurelia-prox1.glb`
4. **FASE 4** — Implementazione componenti
5. **FASE 5** — Copy IT/EN/SV → `messages/{it,en,sv}.json`
6. **FASE 6** — Test E2E Playwright → `tests/e2e/*.spec.ts`
7. **FASE 7** — Review pre-demo (dual-review Claude + OpenCode)

---

*Brief versione 1.0 — locked 2026-04-26. Per modifiche, aggiornare e versionare.*
