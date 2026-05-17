# 01 — UX Architecture: AURELIA Pro X1 Totem

> Output FASE 1. Reference: `docs/00-brief.md`.
> Stato: DRAFT v1 — pending review Lorenzo.
> Target: iPad Pro 12.9" portrait 1080×1920 (primario) + Windows kiosk landscape 1920×1080 (secondario).
> Tier: €6k-10k 3D model-viewer.

---

## 1. User flow

### 1.1 Happy path (sosta 15-45s)

```
                    ┌─────────────────────┐
                    │  IDLE / ATTRACTOR   │  ◀──────────────────────┐
                    │  (loop 12s, 3 scene)│                          │
                    └──────────┬──────────┘                          │
                               │                                     │
                  TOUCH (qualsiasi punto)                             │
                               │                                     │
                               ▼                                     │
                    ┌─────────────────────┐                          │
                    │   ACTIVE / EXPLORE  │                          │
                    │   3D libero, 8 pin  │ ◀────────┐               │
                    │   visibili, picker  │          │               │
                    └──────────┬──────────┘          │               │
                               │                     │               │
              ┌────────────────┼────────────────┐    │               │
              │                │                │    │               │
       TAP su PIN        TAP su LANG       SWIPE/PINCH               │
              │                │           (gesture 3D)              │
              ▼                ▼           solo refresh              │
    ┌──────────────────┐  ┌────────────────┐ camera, no              │
    │  DETAIL PANEL    │  │ LANGUAGE PICKER│ cambio stato            │
    │  slide-in 480px  │  │ dropdown 280×240│        │               │
    │  (portrait)      │  │  (3 opzioni)    │        │               │
    │  modello dim 60% │  │                 │        │               │
    └────────┬─────────┘  └────────┬───────┘         │               │
             │                     │                 │               │
   CLOSE (X / tap         SELECT lang / TAP fuori    │               │
    fuori / ESC)                   │                 │               │
             │                     ▼                 │               │
             │            ┌─────────────────┐        │               │
             │            │ rerender i18n   │        │               │
             │            │ no flicker      │        │               │
             │            └────────┬────────┘        │               │
             └─────────────────────┼─────────────────┘               │
                                   │                                 │
                                   ▼                                 │
                       ┌───────────────────────┐                     │
                       │  IDLE TIMER (60s)     │                     │
                       │  reset on any input   │                     │
                       └───────────┬───────────┘                     │
                                   │                                 │
                                   │ timeout 60s                     │
                                   └─────────────────────────────────┘
```

### 1.2 Descrizione nodi

| Nodo | Stato store | Trigger ingresso | Trigger uscita | Note |
|---|---|---|---|---|
| **IDLE / ATTRACTOR** | `mode = 'attractor'` | mount iniziale + idle 60s | qualsiasi `touchstart` o `pointerdown` su document | Loop GSAP 12s, 3 scene. Lingua resettata a IT. Camera reset. |
| **ACTIVE / EXPLORE** | `mode = 'active'` | uscita da ATTRACTOR / chiusura DETAIL / chiusura LANGUAGE | tap pin / tap picker / idle 60s | Modello manipolabile. Pin visibili con pulse leggero (disabled se `prefers-reduced-motion`). |
| **DETAIL** | `mode = 'detail'`, `activeHotspot = 'h1-boiler'…` | tap su un pin | close button / ESC / tap su backdrop dim / idle 60s | Modello dimmed 60%, gesture 3D disabilitati per evitare conflitti. |
| **LANGUAGE** | `mode = 'language'` | tap su language picker | tap opzione / tap fuori / ESC / idle 60s | Picker dismissible, no overlay full-screen. |

### 1.3 Note sul flow

- Non esiste una **CTA finale** esplicita (il tier €6k-10k è sample-vetrina, non lead-gen). In aperto in §8 se Lorenzo vuole un "Trova rivenditore" come ultima scena attractor.
- Tutti gli stati sono "uscita-libera": in qualsiasi momento idle 60s riporta ad ATTRACTOR.
- Il modello 3D resta sempre montato (no unmount tra stati) per evitare reload `.glb`.

---

## 2. Information Architecture

### 2.1 Gerarchia visiva

| Layer | % viewport | Ruolo | Note |
|---|---|---|---|
| Modello 3D + pin | ~80% | Centro narrativo | Domina sempre la composizione |
| UI chrome (header, picker, indicator) | ~15% | Navigazione | Minimalista, non compete col prodotto |
| Microinterazioni (pulse pin, idle indicator, dim overlay) | ~5% | Feedback | Trasparenze e blur, mai full-opaque |

### 2.2 Z-index map (token CSS)

| Token | Valore | Cosa contiene |
|---|---|---|
| `--z-base` | 0 | Background nero (`#0A0A0A`), texture grain opzionale |
| `--z-canvas` | 10 | `<model-viewer>` + camera controls |
| `--z-pin` | 20 | 8 hotspot pin (overlay sul modello) |
| `--z-chrome` | 30 | Header (logo + tagline), idle indicator, footer microcopy |
| `--z-dim` | 40 | Backdrop dimming overlay quando DETAIL aperto (60% opacity) |
| `--z-panel` | 50 | DetailPanel slide-in |
| `--z-picker` | 60 | LanguagePicker dropdown |
| `--z-attractor` | 70 | Attractor scene (sopra tutto, dismissable solo da touch) |
| `--z-debug` | 9999 | (dev only) telemetria, FPS counter |

Regola: **mai più di 1 layer modale visibile contemporaneamente** (DETAIL e LANGUAGE sono mutuamente esclusivi).

### 2.3 Layout zones — Portrait 1080×1920

```
┌──────────────────────────────────────────────────────┐  y=0
│  SAFE TOP (96px)                                     │
│   ┌─────────────┐                      ┌───────────┐ │
│   │ AURELIA     │                      │  IT  ▾    │ │  HEADER
│   │ PRO X1      │                      │ (picker)  │ │  z-chrome
│   └─────────────┘                      └───────────┘ │
├──────────────────────────────────────────────────────┤  y=160
│                                                      │
│                                                      │
│                                                      │
│                                                      │
│                                                      │
│                                                      │
│              ┌───────────────────┐                   │
│              │                   │                   │  CANVAS 3D
│              │   < model-viewer >│                   │  z-canvas
│              │   8 hotspot pin   │                   │  + z-pin
│              │                   │                   │
│              └───────────────────┘                   │
│                                                      │
│                                                      │
│                                                      │
│                                                      │
│                                                      │
├──────────────────────────────────────────────────────┤  y=1760
│  SAFE BOTTOM (160px)                                 │
│   tagline localizzata centrata                       │  FOOTER
│   "Il caffè, scolpito."                              │  z-chrome
│   ◦ ◦ ◦  microhint gesture (pinch / swipe / tap)     │
│                                                      │
└──────────────────────────────────────────────────────┘  y=1920
```

- **Header**: 96px altezza, padding 32px, logo top-left, picker top-right
- **Canvas**: 1600px altezza utile (1080×1600), modello centrato con padding 80px
- **Footer**: 160px altezza, tagline + microhint, sempre visibile
- **DetailPanel slide-in**: width 480px, height 100vh, da destra → invade ~44% del viewport, modello resta visibile a sinistra

### 2.4 Layout zones — Landscape 1920×1080

```
┌────────────────────────────────────────────────────────────────────┐  y=0
│  SAFE TOP (80px)                                                   │
│  AURELIA PRO X1                                       IT ▾         │  HEADER
├────────────────────────────────────────────────────────────────────┤  y=80
│                                                                    │
│                                                                    │
│           ┌──────────────────────────────────────┐                 │
│           │                                      │                 │
│           │       < model-viewer >               │                 │  CANVAS 3D
│           │       8 hotspot pin                  │                 │
│           │                                      │                 │
│           └──────────────────────────────────────┘                 │
│                                                                    │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤  y=960
│  "Il caffè, scolpito."          ◦ pinch ◦ swipe ◦ tap              │  FOOTER
└────────────────────────────────────────────────────────────────────┘  y=1080
```

- **DetailPanel slide-in** (landscape): width 100vw, height 640px, da basso → invade ~60% verticale, modello resta visibile sopra

### 2.5 Posizionamento elementi fissi

| Elemento | Portrait | Landscape | Token |
|---|---|---|---|
| Logo AURELIA | top-left, 32px margin | top-left, 32px margin | `inset-block-start: 32px; inset-inline-start: 32px;` |
| Tagline localizzata | bottom-center | bottom-left, accanto microhint | safe-bottom |
| Language picker | top-right, 16px margin | top-right, 16px margin | `inset-block-start: 16px; inset-inline-end: 16px;` |
| Idle indicator | nessuno visibile (solo timer interno) | nessuno visibile | hidden DOM, debug only |
| Microhint gesture | bottom 24px, centered, fade-out dopo 5s primo touch | bottom-right | `--z-chrome` |
| Attractor invite | full-canvas overlay solo in attractor mode | full-canvas overlay | `--z-attractor` |

---

## 3. Gesture map

### 3.1 Tabella principale

| Gesture | Trigger | Stato attivo | Feedback visivo | Feedback aptico (iPad) | Edge case / note |
|---|---|---|---|---|---|
| **Tap singolo su pin** | `pointerdown` su `<button.hotspot-pin>` | ACTIVE | Pin scale 1.0 → 1.3 (200ms power3.out), ring rame `#B87333` espansione | `UIImpactFeedbackGenerator.light` via `navigator.vibrate(10)` | Apre DETAIL relativo |
| **Tap singolo su area vuota** | `pointerdown` su canvas 3D, no pin sotto | ACTIVE | Nessuno | Nessuno | No-op (evita aperture accidentali) |
| **Tap singolo su backdrop** | `pointerdown` su `.dim-overlay` | DETAIL | Panel slide-out 320ms power2.in | Nessuno | Chiude DETAIL |
| **Tap singolo su language picker** | `pointerdown` su `.lang-button` | ACTIVE / DETAIL | Dropdown apre 240ms power3.out, stagger 60ms su 3 opzioni | `vibrate(10)` | Entra in LANGUAGE |
| **Tap singolo fuori picker** | `pointerdown` fuori `.lang-dropdown` | LANGUAGE | Dropdown chiude 200ms power2.in | Nessuno | Torna a stato precedente |
| **Swipe orizzontale** | `pointermove` con delta-x > 24px sul canvas | ACTIVE | Rotazione modello sull'asse Y (handled da `model-viewer`) | Nessuno | Disabilitato in DETAIL |
| **Pinch** | 2-finger gesture sul canvas | ACTIVE | Zoom camera distance, clamp 0.6m–2.5m | Nessuno | Handled da `model-viewer camera-controls` |
| **Double-tap area vuota** | 2x `pointerdown` < 300ms apart, no pin | ACTIVE | Camera animata a `--initial-camera-orbit`, durata 600ms | `vibrate([10, 30, 10])` | Reset camera |
| **Double-tap su pin** | 2x `pointerdown` < 300ms apart su pin | ACTIVE | Comportamento di tap singolo (apre DETAIL) | `vibrate(10)` | Il secondo tap viene ignorato |
| **Long-press** | `pointerdown` > 600ms senza movimento | qualsiasi | Nessuno | Nessuno | No-op esplicito (evita context menu browser, `touch-action: none` + `oncontextmenu={(e)=>e.preventDefault()}`) |
| **Edge swipe** | swipe da bordo schermo verso interno | qualsiasi | Nessuno | Nessuno | No-op. Su iPad richiede `Guided Access` lato OS per bloccare swipe Home / Control Center. Lato app: `touch-action: pan-x pan-y` controllato. |
| **ESC (tastiera USB kiosk)** | `keydown` event.key === 'Escape' | DETAIL / LANGUAGE | Stessa animazione close | Nessuno | Fallback accessibilità |

### 3.2 Gesture conflicts

Quattro conflitti potenziali identificati:

#### 3.2.1 Swipe rotazione 3D vs swipe close panel

**Rischio**: l'utente in DETAIL fa swipe sul modello pensando di chiudere il panel, ma il modello ruota.

**Risoluzione**:
- In `mode === 'detail'`, `<model-viewer>` ha `interaction-prompt="none"` e `disable-pan + disable-tap` non bastano: aggiungiamo `pointer-events: none` sul wrapper canvas.
- Il close avviene **solo** via X button, tap su backdrop dim, ESC. Niente swipe-to-close (gesture overloading evitato).

#### 3.2.2 Double-tap reset vs tap singolo lento

**Rischio**: tap singolo molto lento viene riconosciuto come prima parte di un double-tap.

**Risoluzione**:
- Soglia `DOUBLE_TAP_THRESHOLD_MS = 280ms`.
- Il primo tap registra `lastTapAt = performance.now()`. Se entro 280ms arriva il secondo, è double-tap.
- Tap singolo attende 280ms prima di considerarsi finalizzato? **No**: usiamo strategia "fire-on-first" per tap su pin (response immediato). Su area vuota invece il tap singolo non fa nulla, quindi nessun delay percepito.

#### 3.2.3 Pinch su pin vs tap su pin

**Rischio**: due dita atterrano vicino a un pin → il primo finger touch potrebbe registrare un tap.

**Risoluzione**:
- Listener su pin usa `pointerdown` + `pointerup` con `pointerType === 'touch'` e check `event.isPrimary` true.
- Se durante il tap arriva un secondo `pointerdown`, cancelliamo il tap pendente (`abortController.abort()`) e lasciamo `model-viewer` gestire il pinch.

#### 3.2.4 Gesture sistema iOS (swipe Home, Control Center)

**Rischio**: swipe da bordo bottom su iPad apre Control Center / Home.

**Risoluzione**:
- **Lato OS**: iPad in Guided Access mode (Settings → Accessibility → Guided Access). Triplo home + PIN per uscire. Documentato in deploy guide (FASE 7).
- **Lato app**: `body { overscroll-behavior: none; touch-action: none; }` + `<meta name="viewport" content="...interactive-widget=resizes-content">`.
- Su Windows kiosk: usare modalità "Assigned Access" Edge fullscreen, F11 lock.

```tsx
// hint per Claude Code in FASE 4: src/app/[locale]/layout.tsx
useEffect(() => {
  document.body.style.overscrollBehavior = 'none';
  document.body.style.touchAction = 'none';
  const noContext = (e: Event) => e.preventDefault();
  document.addEventListener('contextmenu', noContext);
  return () => document.removeEventListener('contextmenu', noContext);
}, []);
```

---

## 4. Wireflow stati

### 4.1 ATTRACTOR

```
┌──────────────────────────────────────────────────────┐
│  AURELIA                              [picker hidden]│
│  PRO X1                                              │
│                                                      │
│                                                      │
│             ┌─────────────────────┐                  │
│             │                     │                  │
│             │    < model auto-    │                  │
│             │      rotate Y       │                  │
│             │      6 rpm >        │                  │
│             │                     │                  │
│             └─────────────────────┘                  │
│                                                      │
│         ╔══════════════════════════════╗             │
│         ║   IL CAFFÈ, SCOLPITO.        ║   scena A   │
│         ║   AURELIA Pro X1 — €2.890    ║   t=0-4s    │
│         ╚══════════════════════════════╝             │
│                                                      │
│         ╔══════════════════════════════╗             │
│         ║   Tocca per esplorare        ║   scena B   │
│         ║   ◦ ◦ ◦  (gesture loop)      ║   t=4-8s    │
│         ╚══════════════════════════════╝             │
│                                                      │
│         ╔══════════════════════════════╗             │
│         ║   8 dettagli da scoprire     ║   scena C   │
│         ║   [pin highlight zoom]       ║   t=8-12s   │
│         ╚══════════════════════════════╝             │
│                                                      │
│   [tap anywhere = enter ACTIVE]                      │
└──────────────────────────────────────────────────────┘
```

**Timeline GSAP (loop infinito 12s)**

```ts
// hint Claude Code: src/components/attractor/AttractorTimeline.ts
const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'power3.out' } });

// Scena A: headline + slow rotation (0–4s)
tl.fromTo('.attractor-headline', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0)
  .fromTo('.attractor-tagline', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.3)
  .to({}, { duration: 2.6 }, 0.8) // hold
  .to('.attractor-scene-a', { opacity: 0, duration: 0.6 }, 3.4);

// Scena B: invite + gesture demo (4–8s)
tl.fromTo('.attractor-invite', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 4)
  .fromTo('.gesture-dots', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, stagger: 0.15, duration: 0.4 }, 4.6)
  .to({}, { duration: 2.4 }, 5.4)
  .to('.attractor-scene-b', { opacity: 0, duration: 0.6 }, 7.4);

// Scena C: hotspot zoom (8–12s)
tl.fromTo('.attractor-discover', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 8)
  .to('model-viewer', { '--camera-orbit': '45deg 75deg 1.2m', duration: 2, ease: 'power2.inOut' }, 8.4)
  .to({}, { duration: 1 }, 10.4)
  .to('.attractor-scene-c', { opacity: 0, duration: 0.6 }, 11.4);
```

**Transizione in**: fade-in 600ms `power3.inOut` da nero. Modello già montato.
**Transizione out** (su tap): fade-out attractor 400ms `power3.out` + headline scale 1 → 1.05, poi unmount overlay e enter ACTIVE.

**Reduced motion**: timeline disabilitata, mostriamo solo scena A statica con tagline.

### 4.2 ACTIVE

```
┌──────────────────────────────────────────────────────┐
│  AURELIA                                  IT ▾       │
│  PRO X1                                              │
│                                                      │
│                  ◉ h3-display                        │
│                                                      │
│             ┌─────────────────────┐                  │
│         ◉   │                     │   ◉              │
│      h1     │                     │  h8              │
│  -boiler    │   < model-viewer >  │ -gauge           │
│             │                     │                  │
│         ◉   │   [drag/pinch]      │   ◉              │
│       h2    │                     │  h4              │
│   -group    │                     │ -steam           │
│             └─────────────────────┘                  │
│                  ◉ h5-portafilter                    │
│                                                      │
│         ◉ h6-pump        ◉ h7-tank                   │
│                                                      │
│   "Il caffè, scolpito."   ◦ pinch ◦ swipe ◦ tap      │
└──────────────────────────────────────────────────────┘
```

**Pin styling**:
- Cerchio 56×56px (touch target compliant)
- Ring rame `#B87333` 2px, fill nero `#0A0A0A` 80% opacity, backdrop-blur 8px
- Pulse animation: scale 1 → 1.08 → 1 ogni 2.4s, ease `sine.inOut`
- Su `prefers-reduced-motion`: no pulse, ring statico

**Transizione in da ATTRACTOR**: pin fade-in stagger 80ms (0.32s totali) dopo che attractor overlay è scomparso.
**Transizione out**: dipende dal target (DETAIL, LANGUAGE, ATTRACTOR via idle).

```ts
// hint: src/components/hotspot/Pin.tsx
const pulseTl = gsap.to('.pin', {
  scale: 1.08,
  duration: 1.2,
  yoyo: true,
  repeat: -1,
  ease: 'sine.inOut',
  stagger: { each: 0.15, from: 'random' },
});
```

### 4.3 DETAIL

```
PORTRAIT 1080×1920                              LANDSCAPE 1920×1080
┌─────────────────────────────────┐         ┌──────────────────────────────────────────────┐
│  AURELIA              IT ▾      │         │  AURELIA                          IT ▾       │
│  PRO X1                         │         │  PRO X1                                      │
│                ┌───────────────┐│         │                                              │
│                │ ╳   h1-boiler ││         │           ┌──────────────────────────┐       │
│                │               ││         │           │   < model dimmed 60% >   │       │
│  ┌─────────┐   │ Doppia        ││         │           └──────────────────────────┘       │
│  │ model   │   │ caldaia       ││         ├──────────────────────────────────────────────┤
│  │ dimmed  │   │ AISI 316      ││         │  ╳   h1-boiler                               │
│  │ 60%     │   │               ││         │                                              │
│  │         │   │ PID indip.    ││         │  Doppia caldaia AISI 316                     │
│  │         │   │ caffè 93°C    ││         │                                              │
│  │         │   │ vapore 123°C  ││         │  PID indipendenti caffè 93°C — vapore 123°C  │
│  │         │   │               ││         │                                              │
│  │         │   │ [infografica] ││         │  [infografica orizzontale]                   │
│  │         │   │               ││         │                                              │
│  └─────────┘   │ width 480px   ││         │  height 640px (60% v)                        │
│                └───────────────┘│         │                                              │
│                                 │         │                                              │
│  [backdrop dim 60% opacity]     │         │  [backdrop dim 60% opacity]                  │
└─────────────────────────────────┘         └──────────────────────────────────────────────┘
```

**Anatomia panel**:
- **Header**: close button X 56×56px top-right, titolo hotspot in Cormorant 32px
- **Body**: subtitle Inter 18px (descrizione tecnica), infografica SVG, eventuale numero JetBrains Mono 24px (es. "93°C")
- **Footer**: nessuno (no CTA, evita decisione cognitiva extra)
- **Width portrait**: 480px (44.4% di 1080)
- **Height landscape**: 640px (59.3% di 1080)

**Transizione in**: panel slide da destra (portrait) o dal basso (landscape) 480ms `power3.out`. Backdrop fade-in 320ms `power2.out`. Modello camera anima verso il pin selezionato (`camera-target` su hotspot.position) 600ms `power2.inOut`. Modello opacity 1 → 0.4 (dim).

**Transizione out**: panel slide-out 320ms `power2.in`, backdrop fade-out 240ms, modello opacity 0.4 → 1, camera resta dov'è (no auto-reset, lascia all'utente).

**Trigger close**: X button, tap backdrop, ESC, idle 60s, cambio lingua (decisione: chiudiamo, vedi §5).

```ts
// hint: src/components/detail/DetailPanel.tsx
useGSAP(() => {
  const tl = gsap.timeline();
  tl.to('.dim-overlay', { opacity: 0.6, duration: 0.32, ease: 'power2.out' }, 0)
    .fromTo('.detail-panel',
      { x: '100%' },
      { x: 0, duration: 0.48, ease: 'power3.out' }, 0)
    .to('model-viewer', { opacity: 0.4, duration: 0.4 }, 0);
}, [activeHotspot]);
```

### 4.4 LANGUAGE

```
┌──────────────────────────────────────────────────────┐
│  AURELIA                            ┌──────────────┐ │
│  PRO X1                             │ Italiano   ✓ │ │  280×80
│                                     ├──────────────┤ │
│                                     │ English      │ │
│                                     ├──────────────┤ │
│                                     │ Svenska      │ │
│                                     └──────────────┘ │
│                                                      │
│             ┌─────────────────────┐                  │
│             │   < model active >  │                  │
│             │   (no dim)          │                  │
│             └─────────────────────┘                  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Anatomia picker**:
- Trigger button: 96×56px, label lingua corrente + chevron, top-right
- Dropdown: 280×240px (3 opzioni × 80px altezza)
- Surface: `#2A2622` con backdrop-blur 16px, border 1px `rgba(184,115,51,0.3)`
- Opzione attiva: checkmark rame `#B87333`
- No backdrop dim (overlay leggero, modello resta interattivo? **No**, vedi §5.4)

**Transizione in**: dropdown scale 0.92 → 1, opacity 0 → 1, durata 240ms `power3.out`. Stagger 60ms sulle 3 opzioni (`y: 8 → 0`, opacity).
**Transizione out**: scale 1 → 0.96, opacity 1 → 0, durata 200ms `power2.in`.

**Selezione**: tap opzione → router.replace(`/${newLocale}`) con `scroll: false`. Pre-fetch già fatto al mount (vedi §5.5). Cambio rendering atomico in <16ms (un frame).

```ts
// hint: src/components/language/LanguagePicker.tsx
const handleSelect = (locale: 'it' | 'en' | 'sv') => {
  sessionStorage.setItem('aurelia.locale', locale);
  // se DETAIL aperto: chiudiamo prima, poi switchamo (vedi §5.6)
  if (mode === 'detail') closeDetail();
  router.replace(`/${locale}`, { scroll: false });
};
```

---

## 5. Strategia i18n

### 5.1 Stack

- `next-intl` + Next.js 15 App Router, struttura `app/[locale]/...`
- File messaggi: `messages/it.json`, `messages/en.json`, `messages/sv.json`
- Default: IT
- Locales array: `['it', 'en', 'sv']`

### 5.2 Posizione picker

- Top-right, 16px margin (sia portrait sia landscape)
- Sempre visibile (z-`--z-picker` = 60)
- Hidden in ATTRACTOR (l'attractor è fullscreen takeover)

### 5.3 Persistenza locale

- Chiave: `sessionStorage.aurelia.locale`
- Letta al mount in `[locale]/layout.tsx` per redirect se mismatch URL/storage
- **Non** usiamo `localStorage` perché vogliamo reset a IT su nuova sessione fiera (un visitatore non eredita la lingua del precedente)
- Reset 60s no-touch → `sessionStorage.removeItem('aurelia.locale')` + redirect `/it`

### 5.4 Pre-fetch

- Al mount di `[locale]/layout.tsx` lanciamo `router.prefetch('/it')`, `/en`, `/sv` in parallelo
- I bundle messaggi sono piccoli (~6-12KB ciascuno con copy del prototipo) → no-flicker garantito su iPad
- I file `.glb` non vengono ri-fetchati (sono asset shared statici sotto `public/`)

```ts
// hint: src/app/[locale]/layout.tsx
useEffect(() => {
  ['it', 'en', 'sv'].forEach(l => router.prefetch(`/${l}`));
}, [router]);
```

### 5.5 Behavior cambio lingua durante DETAIL aperto

**Decisione**: **chiudiamo il DETAIL prima del cambio lingua**.

Rationale:
- Re-rendering del panel mid-state con copy diverso può causare glitch visivi (altezze infografica diverse tra IT/EN/SV)
- L'utente che cambia lingua sta tipicamente ri-orientandosi, è OK ricominciare l'esplorazione
- Una sequenza pulita (close → switch → enter ACTIVE) è prevedibile

Sequenza:
1. User tap su nuova lingua
2. `closeDetail()` → animazione 320ms
3. Al `onComplete` di chiusura → `router.replace('/${newLocale}')`
4. Mode torna a `active`

### 5.6 Reset linguistico su idle

- 60s no-touch → trigger attractor
- Stessa azione resetta locale a IT (`removeItem` + `replace('/it')`)
- L'attractor stesso parte già localizzato in IT (default)

### 5.7 Edge case: mismatch URL vs storage

- Se URL è `/en` ma storage dice `it` → URL vince (deep-link, condivisione, kiosk pre-set)
- Se URL è `/` (root) → middleware Next redirect a `/${storage || 'it'}`

---

## 6. Idle reset

### 6.1 Eventi monitorati

| Evento | Source | Note |
|---|---|---|
| `touchstart` | `document` | Primario su iPad |
| `touchmove` | `document` | Catch swipe in corso |
| `pointerdown` | `document` | Cross-device (kiosk Windows) |
| `pointermove` | `document` | Throttled 200ms (no spam reset) |
| `mousemove` | `document` | Kiosk Windows con mouse |
| `keydown` | `document` | Tastiera USB kiosk (ESC, Tab, ecc.) |
| `click` | `document` | Backup |

### 6.2 Soglia e timer

- `IDLE_THRESHOLD_MS = 60_000` (60s)
- Timer single-instance, gestito in `IdleResetProvider` (Context React) montato in `[locale]/layout.tsx`
- Reset su ogni evento → `clearTimeout` + `setTimeout`
- `pointermove` / `mousemove` throttled con `requestAnimationFrame` per non spawnare 60+ reset/sec

### 6.3 Trigger animazione

```
[idle 60s] → fadeOut(everything, 400ms, power3.out)
           → setMode('attractor')
           → resetLocale('it')
           → resetCamera()
           → fadeIn(attractor, 600ms, power3.inOut)
           → start AttractorTimeline (loop 12s)
```

Durata totale transizione: ~1.0s.

### 6.4 Edge case: idle scatta DURANTE animazione

**Problema**: idle a 60s mentre slide-in panel a 480ms è in corso → animazioni concorrenti, glitch.

**Soluzione**: lock con flag `isAnimating` nello store.

```ts
// hint: src/stores/uiStore.ts
const useUIStore = create<UIState>((set, get) => ({
  mode: 'attractor',
  isAnimating: false,
  setAnimating: (v: boolean) => set({ isAnimating: v }),
  goIdle: () => {
    if (get().isAnimating) {
      // ritenta tra 1s
      setTimeout(() => get().goIdle(), 1000);
      return;
    }
    set({ mode: 'attractor', activeHotspot: null });
  },
}));
```

Le animazioni GSAP impostano `setAnimating(true)` su `onStart` e `false` su `onComplete`. L'idle transition aspetta che si svuoti, poi triggera con +1s di safety buffer.

### 6.5 Implementation hint

```ts
// hint: src/providers/IdleResetProvider.tsx
'use client';
import { createContext, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/uiStore';

const IDLE_MS = 60_000;
const EVENTS = ['touchstart', 'touchmove', 'pointerdown', 'pointermove',
                'mousemove', 'keydown', 'click'] as const;

export function IdleResetProvider({ children }: { children: React.ReactNode }) {
  const timerRef = useRef<number | null>(null);
  const lastResetRef = useRef(0);
  const router = useRouter();
  const goIdle = useUIStore(s => s.goIdle);

  useEffect(() => {
    const reset = () => {
      // throttle: max 1 reset/200ms
      const now = performance.now();
      if (now - lastResetRef.current < 200) return;
      lastResetRef.current = now;

      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        sessionStorage.removeItem('aurelia.locale');
        goIdle();
        router.replace('/it', { scroll: false });
      }, IDLE_MS);
    };

    EVENTS.forEach(e => document.addEventListener(e, reset, { passive: true }));
    reset(); // first arm

    return () => {
      EVENTS.forEach(e => document.removeEventListener(e, reset));
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [goIdle, router]);

  return <>{children}</>;
}
```

Montato a livello `[locale]/layout.tsx`, fuori dai children (così non si re-monta su navigation).

---

## 7. Accessibilità totem

### 7.1 Tabella rischi → mitigazioni

| # | Rischio | Severity | Mitigazione | Verificabile in test |
|---|---|---|---|---|
| A1 | Tap target troppo piccolo per dito 1.5cm @ 1.2m | HIGH | Min 56×56px su pin, 56×56px su X close, 96×56px su lang button | Playwright `getByRole().boundingBox()` |
| A2 | Contrasto testo crema vs nero | LOW | `#F5F1E8` su `#0A0A0A` = ratio ~14:1 (AAA) | axe-core scan |
| A3 | Contrasto testo crema vs rame `#B87333` | MEDIUM | Da verificare: ratio ~3.7:1 (fail AAA per body, OK per large text ≥18px bold). **Decisione**: rame solo per accent/icone, testo body sempre crema su nero. | axe-core, manual |
| A4 | Nessun audio = nessun feedback per cambio lingua | MEDIUM | `aria-live="polite"` su region che annuncia "Lingua: Inglese" + microcopy visivo (toast 1.5s) | screen reader test (VoiceOver iPad) |
| A5 | Font troppo piccolo da 1.2m | HIGH | Body min 18px, headlines 32px, hero attractor 48-72px (responsive `clamp`) | manual con righello |
| A6 | Animazioni pulse pin disturbano vestibolari | MEDIUM | `@media (prefers-reduced-motion: reduce)` disabilita pulse + auto-rotate attractor | mock prefersReducedMotion in Playwright |
| A7 | Pin senza label per screen reader | MEDIUM | `aria-label` localizzato per ogni pin (es. "Caldaia dual boiler, dettaglio") | axe-core |
| A8 | Focus dispersa fuori da DetailPanel | MEDIUM | Focus trap dentro panel quando aperto (Radix `<FocusTrap>` o custom) + focus su X all'apertura | manual Tab nav |
| A9 | Tastiera USB kiosk: nessun shortcut chiusura | MEDIUM | ESC chiude DETAIL/LANGUAGE/ATTRACTOR (re-enter ACTIVE) | Playwright keyboard |
| A10 | Skip-link mancante per kiosk con tastiera | LOW | `<a href="#main" class="sr-only focus:not-sr-only">Salta al modello</a>` | axe-core |
| A11 | Modello 3D non navigabile via tastiera | HIGH | `<model-viewer>` non offre keyboard nav nativo per hotspot. Fix: lista `<button>` keyboard-navigable separata (visually-hidden ma focusable) che apre stessi DETAIL | manual Tab |
| A12 | Pin poco visibili su 3D in alcune angolazioni | MEDIUM | `model-viewer` usa attribute `slot="hotspot-N" data-position="X Y Z" data-normal="X Y Z"` con auto-occlusion. Verificato out-of-the-box. | manual rotation test |
| A13 | Picker dropdown non accessibile da tastiera | MEDIUM | Pattern ARIA `combobox` con `aria-expanded`, frecce su/giù navigano, Enter seleziona, Esc chiude | axe-core, manual |

### 7.2 Implementation hints accessibility

```tsx
// hint: src/components/hotspot/Pin.tsx
<button
  type="button"
  className="hotspot-pin"
  slot={`hotspot-${id}`}
  data-position={position}
  data-normal={normal}
  aria-label={t(`hotspots.${id}.ariaLabel`)}
  onClick={() => openDetail(id)}
>
  <span className="sr-only">{t(`hotspots.${id}.title`)}</span>
</button>

// hint: focus trap in DetailPanel
useEffect(() => {
  if (!open) return;
  const panel = panelRef.current;
  if (!panel) return;

  const focusables = panel.querySelectorAll<HTMLElement>(
    'button, [href], input, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  first?.focus();

  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { closeDetail(); return; }
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first?.focus();
    }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [open]);
```

### 7.3 Reduced motion fallback

| Componente | Default | Reduced motion |
|---|---|---|
| Attractor timeline | loop 12s con 3 scene animate | scena A statica (headline + tagline), no auto-rotate |
| Pin pulse | scale 1 → 1.08 loop | nessun pulse, ring statico |
| Camera transitions | 600ms power2.inOut | salto istantaneo |
| Panel slide-in | 480ms power3.out | fade 200ms |
| Picker stagger | 60ms × 3 opzioni | fade simultaneo 200ms |

```css
/* hint: src/app/globals.css */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

GSAP rispetto: `gsap.matchMedia()` con `(prefers-reduced-motion: reduce)` per disabilitare timeline pesanti.

---

## 8. Open questions per Lorenzo

1. **CTA finale**: il flow non prevede una CTA "Trova rivenditore" / "Richiedi info" / QR code. È OK per il tier sample-vetrina, oppure vogliamo una scena attractor C che mostra QR o invito? (impatto: +1 scena attractor, no copy aggiuntiva nei panel)
2. **Tagline localizzata in footer**: la mostriamo sempre in ACTIVE/DETAIL, oppure solo in ATTRACTOR? Se sempre, occupa 24-32px verticali in portrait — accettabile?
3. **Microhint gesture in footer**: ◦ pinch ◦ swipe ◦ tap. Deve sparire dopo il primo touch confermato (es. dopo 5s da entry ACTIVE) o restare sempre? Suggerisco fade-out a 5s per non distrarre.
4. **Aptico vibrate iPad**: Safari iOS limita `navigator.vibrate` (in pratica no-op su iPad). Vale la pena lasciare la chiamata "best-effort" o togliamo del tutto? (zero costo lasciarla)
5. **Lingua corrente sotto il button picker**: mostriamo "IT", "EN", "SV" oppure flag emoji? Suggerisco label testuale (più professionale, meno geopolitico).
6. **Behavior cambio lingua dentro DETAIL**: ho deciso "chiudi panel poi switch" (§5.5). Se preferisci "switch in-place" lo cambio, ma serve lock-altezza per evitare jump.
7. **Idle indicator visibile**: il brief non lo richiede ma alcuni totem mostrano countdown ultimi 10s. Lo aggiungiamo come barra sottile o nessun indicator (più "magico")?
8. **Rotation lock in DETAIL**: ho proposto `pointer-events: none` su canvas in DETAIL. Alternativa: lasciare rotazione possibile (l'utente vede pin selezionato e contesto). Preferenza?
9. **Hotspot occlusion**: `model-viewer` di default nasconde i pin dietro la geometria (gradient occlusion). Vogliamo `data-visibility-attribute="visible"` (sempre visibili anche dietro) o default occluso (più naturale)?
10. **Camera reset double-tap**: portiamo a `--initial-camera-orbit` o salviamo last-known-good orbit per ogni sessione? Suggerisco initial (predicibile).
11. **Skip-link per tastiera kiosk**: utile solo se prevediamo deploy con tastiera USB. Lo includiamo "for free" (1 riga HTML) o togliamo per pulizia?
12. **Locale sticky**: se Lorenzo vuole che un kiosk in stand svedese parta sempre in SV (no reset a IT), aggiungiamo flag `?locale=sv` di build time o env var `NEXT_PUBLIC_DEFAULT_LOCALE`.

---

## 9. Handoff a FASE 2 (UI design system)

### 9.1 Cosa il ui-designer / frontend-design deve ricevere come input

#### Token CSS richiesti

| Categoria | Token | Valore proposto | Note |
|---|---|---|---|
| Color | `--color-bg` | `#0A0A0A` | nero profondo |
| Color | `--color-surface` | `#2A2622` | grigio caldo |
| Color | `--color-text` | `#F5F1E8` | crema avorio |
| Color | `--color-text-muted` | `rgba(245,241,232,0.7)` | crema 70% |
| Color | `--color-accent` | `#B87333` | rame brunito |
| Color | `--color-accent-soft` | `rgba(184,115,51,0.3)` | per border, ring |
| Color | `--color-highlight` | `#FFFFFF` | bianco puro, sparingly |
| Type | `--font-display` | `'Cormorant Garamond', serif` | titoli |
| Type | `--font-body` | `'Inter', sans-serif` | UI/body |
| Type | `--font-mono` | `'JetBrains Mono', monospace` | numeri tecnici |
| Type | `--text-base` | `clamp(1.125rem, 0.9rem + 0.4vw, 1.25rem)` | 18-20px |
| Type | `--text-headline` | `clamp(2rem, 1.5rem + 1.5vw, 2.5rem)` | 32-40px |
| Type | `--text-hero` | `clamp(3rem, 2rem + 3vw, 4.5rem)` | 48-72px |
| Space | `--space-safe` | `32px` | padding header/footer |
| Space | `--touch-min` | `56px` | min target |
| Z | `--z-base` … `--z-attractor` | come §2.2 | 0 → 70 |
| Motion | `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | hero motion |
| Motion | `--duration-fast` | `200ms` | micro |
| Motion | `--duration-normal` | `400ms` | panel/picker |
| Motion | `--duration-slow` | `600ms` | attractor scene-out |

#### Componenti necessari (FASE 2 → FASE 4)

| Componente | Tipo | Stato locale | Note design |
|---|---|---|---|
| `<Header>` | layout | nessuno | logo + spacer, sempre visibile |
| `<Footer>` | layout | nessuno | tagline + microhint, fade-out 5s primo touch |
| `<LanguagePicker>` | interactive | open/close | combobox ARIA, dropdown 280×240 |
| `<HotspotPin>` | interactive | hover/active/selected | 56×56, ring rame, pulse |
| `<DetailPanel>` | overlay | open/close | slide-in 480px portrait / 640px landscape |
| `<DimOverlay>` | overlay | visible/hidden | 60% opacity nero, tap chiude DETAIL |
| `<AttractorOverlay>` | overlay | visible/hidden | 3 scene loop, fullscreen takeover |
| `<HotspotInfographic>` | content | nessuno | 8 varianti specifiche (h1-boiler … h8-gauge) |
| `<MicroHint>` | content | visible/hidden | dots + gesture name, fade-out 5s |

#### Asset 3D requisiti (FASE 3)

- File: `public/models/aurelia-prox1.glb`
- Dimensioni target: <8MB compressed, draco+mesh-optim
- 8 hotspot positions: TBD durante FASE 3 (Tripo AI export + Blender placement)
- Camera initial orbit: `45deg 75deg 1.5m` (suggerito, da rifinire)
- Camera bounds: `min-camera-orbit "auto auto 0.6m"` / `max-camera-orbit "auto auto 2.5m"`
- Environment: HDR studio, ombre soft (preset `neutral.hdr` di model-viewer)

#### Copy chiavi richieste (FASE 5)

Per ogni `messages/{it,en,sv}.json`:

```json
{
  "attractor": {
    "headline": "...",
    "tagline": "...",
    "invite": "...",
    "discover": "..."
  },
  "footer": {
    "tagline": "...",
    "microhint": ["pinch", "swipe", "tap"]
  },
  "picker": {
    "label": "...",
    "current": "..."
  },
  "hotspots": {
    "h1-boiler": { "title": "...", "subtitle": "...", "ariaLabel": "..." },
    "h2-group":  { "...": "..." },
    "h3-display":{ "...": "..." },
    "h4-steam":  { "...": "..." },
    "h5-portafilter": { "...": "..." },
    "h6-pump":   { "...": "..." },
    "h7-tank":   { "...": "..." },
    "h8-gauge":  { "...": "..." }
  },
  "common": {
    "close": "...",
    "languageChanged": "..."
  }
}
```

#### Test plan stub (FASE 6)

- `tests/e2e/01-attractor.spec.ts` — loop 12s, transition tap → ACTIVE
- `tests/e2e/02-hotspots.spec.ts` — tap su tutti 8 pin, verifica titolo correct
- `tests/e2e/03-language.spec.ts` — switch IT→EN→SV, verifica copy
- `tests/e2e/04-idle.spec.ts` — fast-forward 60s, verifica reset attractor + locale IT
- `tests/e2e/05-a11y.spec.ts` — axe-core scan, focus trap, ESC close
- `tests/e2e/06-gesture.spec.ts` — touch emulation iPad: pinch, swipe, double-tap

### 9.2 Decisioni locked da FASE 1 (non ridiscutere in FASE 2)

- 4 stati UI: `attractor | active | detail | language`
- Z-index map come §2.2
- Idle threshold = 60s
- Cambio lingua chiude DETAIL (§5.5)
- Pin = 56×56, touch target compliant
- DetailPanel = 480px portrait / 640px landscape
- Attractor loop = 12s, 3 scene
- Reduced motion = pulse off, attractor static, panel fade

### 9.3 Decisioni delegate a FASE 2 (UI designer)

- Esatto SVG/icon per pin (pallino, anello, numero?)
- Trattamento infografica per hotspot (orientamento icona + numero + label)
- Sfumature, grain, texture sui background
- Posizionamento esatto microhint (3 dots vs 3 icone gesture)
- Stile chevron picker (▾ char vs SVG)
- Easing ulteriori per microinterazioni

---

*FASE 1 v1 chiusa il 2026-04-26. Pending review Lorenzo sulle 12 open questions in §8 prima di procedere a FASE 2.*
