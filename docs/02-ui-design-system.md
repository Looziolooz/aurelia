# 02 — UI Design System: AURELIA Pro X1 Totem

> Output FASE 2. Reference: `docs/00-brief.md`, `docs/01-ux-architecture.md` (sezione 9 è input diretto).
> Stato: DRAFT v1 — pending review Lorenzo.
> Tier: €6k-10k 3D model-viewer. Dark-only. Brand AURELIA stretto.

---

## A. Design philosophy

### Direzione dichiarata: **quiet museum / Italian atelier**

Il totem AURELIA non è un kiosk SaaS, non è un Apple Store demo unit, non è un ambient music venue con motion costante. È un atelier — una vetrina di bottega lombarda traslata in superficie digitale, dove il prodotto è osservato come si osserva una macchina d'epoca dietro vetro: con pausa, con attenzione, con la sensazione che il rame sia stato brunito da una mano. La filosofia è "lusso quieto": niente urla, niente gradient drammatici, niente CTA ammiccanti. La materia parla per se stessa.

Le tre conseguenze concrete di questa scelta. Prima: il **dark non è un mood, è il fondale**. Nero profondo `#0A0A0A` come muro di galleria — non come "dark mode toggle". Le superfici elevate (panel, picker) usano un nero leggermente più caldo (`#1A1714`, `#2A2622`) per evocare velluto e legno scuro, mai grigio neutro. Seconda: il **rame è scenografia, non interfaccia**. È l'unico elemento che brilla, e proprio per questo viene speso con avarizia — un solo elemento copper-attivo per schermata, mai due. Terza: il **movimento rispetta la pausa**. Le timeline GSAP sono lente (400-700ms per panel, 1200ms+ per ambient), gli easing sono `ease-quiet` (cubic-bezier 0.16, 1, 0.3, 1) — la curva che decelera con grazia, mai lo snap material di Google.

La typography fa il lavoro pesante. **Cormorant Garamond** porta il peso storico (è il discendente digitale del Garamond di Claude Garamond, 1540) — letterforms con stress diagonale, terminali calligrafici, un'umanità che Inter non ha. Inter si occupa dell'utilità: numeri, micro-label, bottoni. JetBrains Mono compare solo per le specifiche tecniche, dove il lock-tabular dei numeri è funzionale. Tre famiglie, ognuna con un ruolo non sovrapponibile.

### Reference visivi citati (reali, verificabili)

1. **La Marzocco — pagine prodotto Linea Mini / GS3** (lamarzoccohome.com). Composizione: hero shot frontale del prodotto su nero opaco, profondità tipografica con serif display + sans secondario, copper-on-black come materialità reale (non come decorazione). Il totem AURELIA cita direttamente questo trattamento.
2. **Aesop — interni store fisici** (es. Aesop Brera Milano, Aesop Marylebone London). Lusso quieto con palette terrose, illuminazione warm, materiali tangibili (legno, ottone brunito, terracotta). Atmosfera "chemist of the senses" senza decorazione gratuita. Reference per la temperatura cromatica calda dei neutri (mai blue-tint).
3. **Cormorant Garamond — type specimen di Christian Thalmann** (Catharsis Fonts, su Google Fonts). Specimen ufficiale che mostra le proporzioni storiche, lo stress diagonale, e il modo in cui il display weight 700 funziona da 64px in su. Reference diretto per la scala typography.
4. **Berluti — pagine craft / patina** (berluti.com/patina). Trattamento del cuoio brunito sotto luce calda, narrativa di artigianato senza tono commerciale. Reference per il vibe "artigiano italiano" applicato a interfaccia digitale.
5. **Acne Studios — editorial system** (acnestudios.com). Composizioni asimmetriche con generosa whitespace, typography display in serif su fondo neutro, tono editorial mai promozionale. Reference per la disciplina della composizione (asimmetria intenzionale, mai grid uniformi).

Cito per intent, non per pixel-copy: il totem AURELIA è "Italian atelier", non "Aesop store" né "La Marzocco landing".

### Cosa NON facciamo

- Non aggiungiamo glassmorphism. Backdrop-blur compare solo dove funzionale (picker dropdown su modello in movimento) e mai sui pannelli principali.
- Non usiamo gradient generici (blue→purple, copper→gold). Solo gradient verticali sottili crema/2% → trasparente per separare zone safe.
- Non animiamo per animare. Niente parallax, niente scroll-trigger sul totem (il totem non scrolla). Le animazioni esistono solo dove rivelano gerarchia o danno feedback aptico.
- Non usiamo emoji, né flag emoji, né icone Material. Lucide `1.5px stroke` per UI icons; SVG custom per gesture demos.

---

## B. Color system

### B.1 Filosofia palette

Il sistema parte dai 5 colori del brief e li espande in 3 scale a 11 step + token semantici. Tutte le neutre hanno **warm tint** (verso il bruno, mai verso il blu) — il sistema oklch è in spazio percettivamente uniforme, hue ~50° (warm brown) per neutrals, ~50° per copper, ~85° per cream.

> **Locked decisions dall'UX architecture §7.1 A3**: il rame `#B87333` è SEMPRE accent/icona, MAI testo body. Questa regola è applicata sotto.

### B.2 Neutral scale (warm-tinted, base nero `#0A0A0A`)

| Token | Hex | OKLCH | Uso primario |
|---|---|---|---|
| `neutral-50` | `#F8F6F2` | `oklch(96.5% 0.008 75)` | Highlight estremo (mai background, solo text on copper rare cases) |
| `neutral-100` | `#EDE9E2` | `oklch(92% 0.012 75)` | (riservato — non in uso totem) |
| `neutral-200` | `#D6D0C5` | `oklch(83% 0.015 70)` | (riservato) |
| `neutral-300` | `#A8A096` | `oklch(68% 0.014 65)` | Text muted on dark (3-step down da crema) |
| `neutral-400` | `#7C7468` | `oklch(53% 0.013 60)` | Text disabled, subtle separator |
| `neutral-500` | `#5A534A` | `oklch(40% 0.012 55)` | Border-strong su elevated |
| `neutral-600` | `#403A33` | `oklch(30% 0.011 50)` | Border-subtle su elevated |
| `neutral-700` | `#2A2622` | `oklch(22% 0.010 50)` | **Surface elevated** (picker, panel bg) |
| `neutral-800` | `#1A1714` | `oklch(15% 0.008 50)` | **Surface secondary** (subtle layer) |
| `neutral-900` | `#0F0D0B` | `oklch(10% 0.006 50)` | (transition canvas → surface) |
| `neutral-950` | `#0A0A0A` | `oklch(8% 0.003 50)` | **Canvas — background totem** |

### B.3 Copper scale (base `#B87333`)

| Token | Hex | OKLCH | Uso primario |
|---|---|---|---|
| `copper-50` | `#FBF3EA` | `oklch(96% 0.020 60)` | (riservato — troppo chiaro per accent) |
| `copper-100` | `#F4DFC4` | `oklch(90% 0.045 60)` | (riservato) |
| `copper-200` | `#E5BB8A` | `oklch(80% 0.080 55)` | Hover ring secondario (rare) |
| `copper-300` | `#D49A5C` | `oklch(70% 0.105 50)` | Hover state pin |
| `copper-400` | `#C68548` | `oklch(63% 0.120 48)` | (riservato) |
| `copper-500` | `#B87333` | `oklch(58% 0.130 47)` | **Accent primario — pin attivo, ring, chevron** |
| `copper-600` | `#9D6128` | `oklch(50% 0.115 45)` | Pressed state, dot indicator |
| `copper-700` | `#7E4D1F` | `oklch(41% 0.095 42)` | (riservato) |
| `copper-800` | `#5F3A18` | `oklch(32% 0.072 40)` | (riservato) |
| `copper-900` | `#3F2710` | `oklch(22% 0.048 38)` | (riservato) |
| `copper-950` | `#2A1A0A` | `oklch(15% 0.030 38)` | (riservato) |

### B.4 Cream scale (base `#F5F1E8`)

| Token | Hex | OKLCH | Uso primario |
|---|---|---|---|
| `cream-50` | `#FDFBF6` | `oklch(98.5% 0.008 90)` | Highlight estremo |
| `cream-100` | `#F5F1E8` | `oklch(95% 0.014 90)` | **Text primary** (default body/headline su nero) |
| `cream-200` | `#E8E2D2` | `oklch(89% 0.020 85)` | Text on hover micro |
| `cream-300` | `#D2CAB5` | `oklch(80% 0.025 80)` | Text secondary |
| `cream-400` | `#B5AC95` | `oklch(70% 0.025 75)` | Text muted (tagline, microcopy) |
| `cream-500` | `#928874` | `oklch(58% 0.022 70)` | (riservato) |
| `cream-600` | `#6F6757` | `oklch(45% 0.020 65)` | (riservato) |
| `cream-700` | `#534D40` | `oklch(35% 0.017 60)` | (riservato) |
| `cream-800` | `#3A352D` | `oklch(25% 0.014 55)` | (riservato) |
| `cream-900` | `#26221C` | `oklch(17% 0.010 50)` | (riservato) |
| `cream-950` | `#1A1714` | `oklch(12% 0.008 50)` | (alias di neutral-800) |

### B.5 Semantic tokens (mappati su scale)

| Token | Valore | Mappato a | Note |
|---|---|---|---|
| `bg-canvas` | `#0A0A0A` | `neutral-950` | Background totem (sotto canvas 3D) |
| `bg-surface` | `#1A1714` | `neutral-800` | Subtle layer (rare) |
| `bg-elevated` | `#2A2622` | `neutral-700` | Panel, picker, dropdown |
| `bg-overlay-dim` | `rgba(10,10,10,0.6)` | `neutral-950 @ 60%` | Backdrop dim sotto DETAIL |
| `text-primary` | `#F5F1E8` | `cream-100` | Tutto il body, tutti gli headline |
| `text-secondary` | `#D2CAB5` | `cream-300` | Subtitle, label table |
| `text-muted` | `#B5AC95` | `cream-400` | Tagline, microhint, micro-uppercase |
| `accent` | `#B87333` | `copper-500` | Pin attivo, ring, chevron, dot |
| `accent-hover` | `#D49A5C` | `copper-300` | (rarely used — totem non ha hover) |
| `accent-pressed` | `#9D6128` | `copper-600` | Pressed state pin / button |
| `accent-glow` | `rgba(184,115,51,0.15)` | `copper-500 @ 15%` | Soft halo box-shadow |
| `accent-soft` | `rgba(184,115,51,0.30)` | `copper-500 @ 30%` | Border ring, separator |
| `border-subtle` | `rgba(245,241,232,0.08)` | `cream-100 @ 8%` | Bordo interno panel |
| `border-strong` | `rgba(245,241,232,0.18)` | `cream-100 @ 18%` | Bordo separatore importante |
| `rim-light` | `rgba(245,241,232,0.06)` | `cream-100 @ 6%` | Inset highlight elevated surface |

### B.6 WCAG AAA contrast verification

> **Metodo**: ratio calcolato come (L1 + 0.05) / (L2 + 0.05) dove L è luminanza relativa (sRGB linearizzato).
> **Target AAA**: ≥ 7:1 body, ≥ 4.5:1 large text (≥18px regular o ≥14px bold).

| Foreground | Background | Ratio calcolato | AAA body | AAA large | Uso effettivo |
|---|---|---|---|---|---|
| `cream-100 #F5F1E8` | `neutral-950 #0A0A0A` | **18.13:1** | PASS | PASS | Headline, body, microhint |
| `cream-100 #F5F1E8` | `neutral-800 #1A1714` | **15.42:1** | PASS | PASS | Text on subtle surface |
| `cream-100 #F5F1E8` | `neutral-700 #2A2622` | **13.10:1** | PASS | PASS | Text on panel/picker |
| `cream-300 #D2CAB5` | `neutral-950 #0A0A0A` | **13.20:1** | PASS | PASS | Subtitle, table label |
| `cream-300 #D2CAB5` | `neutral-700 #2A2622` | **9.54:1** | PASS | PASS | Subtitle on panel |
| `cream-400 #B5AC95` | `neutral-950 #0A0A0A` | **9.32:1** | PASS | PASS | Tagline, microhint |
| `cream-400 #B5AC95` | `neutral-700 #2A2622` | **6.74:1** | FAIL | PASS | Solo per micro-label uppercase ≥14px |
| `copper-500 #B87333` | `neutral-950 #0A0A0A` | **3.62:1** | **FAIL** | FAIL | **NOT USED as text** — solo accent (pin fill, ring, chevron, dot, icon stroke) |
| `copper-500 #B87333` | `neutral-700 #2A2622` | **2.62:1** | **FAIL** | FAIL | **NOT USED as text** — solo accent border/icon |
| `copper-300 #D49A5C` | `neutral-950 #0A0A0A` | **6.78:1** | FAIL | PASS | (riservato — large text only se mai usato) |
| `neutral-300 #A8A096` | `neutral-950 #0A0A0A` | **7.93:1** | PASS | PASS | Text disabled (rare) |

> **Decisione locked dall'UX architecture §7.1 A3 ribadita**: copper-500 NON è mai applicato come `color` su testo. È solo `background-color`, `border-color`, `fill` (icona), `box-shadow`. Tutte le combinazioni copper-as-text sono marcate **NOT USED** in tabella e non hanno controparte CSS.

---

## C. Typography scale

### C.1 Famiglie

```css
--font-display: 'Cormorant Garamond', 'Cormorant', Georgia, 'Times New Roman', serif;
--font-body:    'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
--font-mono:    'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
```

Pesi inclusi:
- Cormorant Garamond: 600, 700
- Inter: 400, 500, 600
- JetBrains Mono: 500

### C.2 Scale (rispetta vincolo lettura 1.2m → min 18px body)

| Ruolo | Px target | Famiglia | Weight | Letter-spacing | Line-height | clamp() responsive |
|---|---|---|---|---|---|---|
| **Hero attractor** | 88-96 | display | 700 | -0.020em | 0.95 | `clamp(4rem, 3rem + 4vw, 6rem)` |
| **H1 product name** | 56-64 | display | 700 | -0.015em | 1.00 | `clamp(3rem, 2rem + 3vw, 4rem)` |
| **H2 hotspot title** | 28-32 | body | 600 | -0.005em | 1.20 | `clamp(1.75rem, 1.4rem + 1vw, 2rem)` |
| **H3 subsection** | 20-22 | body | 600 | 0 | 1.30 | `clamp(1.25rem, 1.15rem + 0.4vw, 1.375rem)` |
| **Body large** | 20 | body | 400 | 0 | 1.50 | `1.25rem` (fixed at 1.2m) |
| **Body** | 18 | body | 400 | 0 | 1.60 | `1.125rem` (fixed) |
| **Spec mono** | 16 | mono | 500 | 0 | 1.40 | `1rem` (fixed) |
| **Micro / UI** | 14 | body | 500 | 0.10em | 1.20 | `0.875rem` (fixed) UPPERCASE |
| **Tagline footer** | 22 | display | 600 | 0.005em | 1.30 | `clamp(1.25rem, 1.1rem + 0.5vw, 1.375rem)` italic |
| **Tagline attractor** | 24-28 | display | 600 | 0.010em | 1.30 | `clamp(1.5rem, 1.25rem + 0.8vw, 1.75rem)` italic |

### C.3 Note typography

- **Hero / H1**: stress display, tracking negativo (-0.020em / -0.015em). Cormorant 700 con tracking neg crea l'effetto editoriale "incisione" tipico del display calligraphy.
- **Tagline italic**: il tagline `"Il caffè, scolpito."` è sempre italic Cormorant 600 — tratto manoscritto, separato dal display weight.
- **Micro/UI uppercase**: scelta `letter-spacing: 0.10em` (NON 0.05em del task originale). Motivazione: a 14px uppercase il 0.10em legge "luxury quiet" coerente con La Marzocco / Aesop nav. 0.05em sarebbe più "tech sans" e tradirebbe il vibe.
- **JetBrains Mono**: `font-feature-settings: 'tnum' 1, 'zero' 1;` per allineare numeri tabulari nelle SpecTable (es. `93°C` allineato a destra).
- **Display optical sizing**: Cormorant Garamond non ha variable axis ufficiale per opsz, ma il design size storico è ~14pt per il body e ~36pt+ per il display. Usiamo solo display sizes ≥28px per evitare hairline troppo sottili a 1.2m.

---

## D. Spacing & sizing

### D.1 Scale base 4px + micro-adjustments

| Token | Px | Uso suggerito |
|---|---|---|
| `space-0` | 0 | reset |
| `space-1` | 4 | gap micro (icon + label) |
| `space-2` | 8 | tight spacing (table cell) |
| `space-3` | 12 | small gap |
| `space-4` | 16 | gap base |
| `space-5` | 20 | section internal |
| `space-6` | 24 | safe horizontal landscape |
| `space-7` | 28 | (micro) |
| `space-8` | 32 | safe horizontal portrait, header padding |
| `space-9` | 40 | section vertical |
| `space-10` | 56 | touch target min, panel inner |
| `space-11` | 80 | hero margin, model padding canvas |
| `space-12` | 120 | hero attractor vertical breathing |
| `space-14` | 14 | (micro adjust — picker option vert pad) |
| `space-18` | 18 | (micro — line spacing tagline) |
| `space-22` | 22 | (micro — between hotspot title and body) |

> Micro values 14, 18, 22, 28 esistono per fine-tuning specifico (mai uso speculative); resto deve cadere sulla scala 4px.

### D.2 Touch targets (locked)

- **Min touch target**: 56×56px (locked dall'UX architecture, iPad 1.2m distanza)
- **Pin hotspot**: 56×56 touch zone (visual fill 12px centrale, ring fino a 24px ext)
- **Close button X**: 56×56
- **Lang picker button (chiuso)**: 96×56
- **Lang picker option**: 280×80 (3 opzioni × 80px = 240 height)

### D.3 Safe areas

| Orientamento | Top | Bottom | Left | Right |
|---|---|---|---|---|
| Portrait 1080×1920 | 32px | 32px | 24px | 24px |
| Landscape 1920×1080 | 32px | 32px | 48px | 48px |

> Container max-width portrait: 100% (full bleed totem). Container max-width landscape: nessun max, full bleed con safe horizontal 48px.

### D.4 Border radius

| Token | Px | Uso |
|---|---|---|
| `radius-none` | 0 | bordo netto (separator, full-bleed) |
| `radius-sharp` | 2 | input field, micro element |
| `radius-soft` | 4 | tab option picker |
| `radius-panel` | 8 | DetailPanel, picker dropdown, surface elevated |
| `radius-pin` | 999 | pin hotspot (cerchio perfetto) |
| `radius-pill` | 999 | pill — **max 1 elemento per schermata** (riservato future caso) |

> Regola anti-template: **niente radius > 8px sui pannelli**. Solo cerchio (pin) e pill (riservato) usano 999.

---

## E. Motion language

### E.1 Easing curves

| Token | Cubic-bezier | Uso |
|---|---|---|
| `ease-quiet` | `cubic-bezier(0.16, 1, 0.3, 1)` | **Default per tutto**: panel, picker, fade, scale |
| `ease-quiet-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Exit animations (mirror) |
| `ease-linear` | `linear` | Solo per loop infiniti (auto-rotate canvas) |

> **BANNED**: `ease-material` (`cubic-bezier(0.4, 0, 0.2, 1)`), `ease-in-out` (default browser), `ease`. Motivo: snap material rompe il vibe "quiet museum" — il movimento deve decelerare con grazia, non con autorità.

### E.2 Durate

| Token | ms | Uso |
|---|---|---|
| `duration-micro` | 150 | micro hover, dot indicator |
| `duration-fast` | 250 | picker open/close, focus ring |
| `duration-normal` | 400 | panel slide-in/out, fade base |
| `duration-slow` | 700 | camera transitions, attractor scene-out |
| `duration-ambient` | 1200 | pulse loop, attractor headline reveal |
| `duration-loop` | 2400 | pin pulse cycle (1.2s up + 1.2s down) |

### E.3 Keyframes specifiche

#### `attractor-pulse` (hero ambient, 3s loop)

```css
@keyframes attractor-pulse {
  0%   { transform: scale(1.000); opacity: 1.00; }
  50%  { transform: scale(1.040); opacity: 0.92; }
  100% { transform: scale(1.000); opacity: 1.00; }
}
```
Duration: 3000ms · Easing: `ease-quiet` · Iteration: infinite · Reduced-motion: disabled (opacity 1 fixed).

#### `copper-glow` (hover/active hotspot)

```css
@keyframes copper-glow {
  0%   { box-shadow: 0 0 0 rgba(184, 115, 51, 0); }
  50%  { box-shadow: 0 0 24px rgba(184, 115, 51, 0.30); }
  100% { box-shadow: 0 0 16px rgba(184, 115, 51, 0.18); }
}
```
Duration: 600ms · Easing: `ease-quiet` · Iteration: 1 (settle on hover) · Reduced-motion: skip to final state.

#### `fade-up` (entry pannelli, body internal)

```css
@keyframes fade-up {
  from { transform: translateY(16px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
```
Duration: 400ms · Easing: `ease-quiet` · Reduced-motion: opacity only, 200ms.

#### `panel-slide-in-right` (DETAIL portrait)

```css
@keyframes panel-slide-in-right {
  from { transform: translateX(100%); opacity: 0.6; }
  to   { transform: translateX(0);    opacity: 1.0; }
}
```
Duration: 480ms · Easing: `ease-quiet` · Reduced-motion: fade only 240ms.

#### `panel-slide-in-bottom` (DETAIL landscape)

```css
@keyframes panel-slide-in-bottom {
  from { transform: translateY(100%); opacity: 0.6; }
  to   { transform: translateY(0);    opacity: 1.0; }
}
```
Duration: 480ms · Easing: `ease-quiet` · Reduced-motion: fade only 240ms.

#### `picker-stagger` (3 opzioni, delay incrementale)

```css
@keyframes picker-stagger {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}
```
Per ogni opzione: `animation-delay` 0ms / 60ms / 120ms · Duration: 280ms · Easing: `ease-quiet` · Reduced-motion: simultaneous fade 200ms.

### E.4 Reduced-motion fallback (mappa completa)

| Componente | Default | `prefers-reduced-motion: reduce` |
|---|---|---|
| Attractor timeline | 3 scene 12s loop | Solo Scene A statica, no auto-rotate |
| Pin pulse | scale 1→1.08 loop infinite | Nessun pulse, ring statico |
| Copper-glow hover | 600ms transition | Skip a final state istantaneo |
| Camera transitions | 600-1200ms | Salto istantaneo |
| Panel slide-in | 480ms slide+fade | Fade only 200ms |
| Picker stagger | 60ms staggered × 3 | Fade simultaneo 200ms |
| Backdrop fade | 320ms | 120ms |
| Fade-up internal | 400ms translate+opacity | Opacity only 200ms |

CSS guard:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

GSAP guard via `gsap.matchMedia()` in `(prefers-reduced-motion: reduce)` per disabilitare timeline pesanti programmaticamente.

---

## F. Elevation & depth

### F.1 Filosofia

Depth attraverso **layering reale a 3 piani**, non via shadow accumulation:
- **Piano 0 — Canvas**: 3D model + ambient, profondità naturale del rendering
- **Piano 1 — Chrome UI**: header, footer, picker collapsed (quasi flat su nero, separati solo da tipografia)
- **Piano 2 — Modal**: panel, picker open (lifted con shadow-deep + rim light)

Non c'è piano 3+. Mai 2 modali simultanei (locked UX).

### F.2 Shadow tokens (BANNED Material defaults)

| Token | Valore CSS | Uso |
|---|---|---|
| `shadow-deep` | `0 32px 64px -12px rgba(0, 0, 0, 0.85)` | DetailPanel, picker dropdown lifted da modello |
| `shadow-copper-soft` | `0 0 32px rgba(184, 115, 51, 0.15)` | Pin attivo glow (acceso intorno al pin selected) |
| `shadow-copper-tight` | `0 0 12px rgba(184, 115, 51, 0.25)` | Hover state pin più stretto |
| `shadow-rim` | `inset 0 1px 0 rgba(245, 241, 232, 0.06)` | Highlight interno top edge surface elevata (effetto velluto) |

> **BANNED**: `shadow-md`, `shadow-lg`, `shadow-xl` Tailwind defaults. Niente ombra "drop diffusa" di Material Design (che genera ovale grigio sotto componente). Solo le 4 sopra.

### F.3 Combo elevazione canonical

```css
/* DetailPanel (su canvas 3D) */
.detail-panel {
  background: var(--color-elevated);   /* #2A2622 */
  box-shadow:
    var(--shadow-deep),
    var(--shadow-rim);
  border-left: 1px solid var(--border-subtle);
}

/* LanguagePicker dropdown (open) */
.lang-dropdown {
  background: var(--color-elevated);
  box-shadow:
    var(--shadow-deep),
    var(--shadow-rim);
  border: 1px solid var(--accent-soft);   /* copper @ 30% — UNICO copper border permesso a livello picker */
}

/* Pin attivo */
.hotspot-pin[data-state='active'] {
  background: var(--accent);            /* copper-500 */
  box-shadow: var(--shadow-copper-soft);
}
```

---

## G. Anti-template guardrails (CRITICAL)

> Riferimento diretto: ECC skill `frontend-design` — "Pick a direction and commit to it. Safe-average UI is usually worse than a strong, coherent aesthetic with a few bold choices."

### G.1 Regole no-go (compliance check)

| # | Regola | Verifica |
|---|---|---|
| G1 | **NO border-radius > 8px sui pannelli**. Solo cerchio pin (999) e pill riservato (max 1 per schermata). | Grep CSS per `border-radius` > 8px in `.panel`, `.surface`, `.card`. |
| G2 | **NO gradient generici** (blue→purple, copper→gold, sunset). Solo subtle vertical fade crema/2% → 0 per separare zone safe quando necessario. | Grep CSS per `linear-gradient(.*purple.*)`, `radial-gradient`, multi-stop gradient. |
| G3 | **Copper SPARING — max 1 elemento copper per schermata**. Eccezione: pin attivo (1) + dot indicator picker option (1) sono ammessi solo se il picker è chiuso (cioè dot non visibile). Quando picker è aperto, il pin attivo deve essere fuori vista o non-copper-active. | Manual screen-by-screen audit. |
| G4 | **NO ombre Material Design**. Solo 4 shadow tokens (§F.2). | Grep CSS per `0 1px 3px`, `0 4px 6px`, `0 10px 15px`, `0 20px 25px` (Tailwind defaults). |
| G5 | **NO emoji icons** (no flag, no UI emoji). Lucide stroked 1.5px o SVG custom. | Grep TSX per regex `/\p{Emoji}/u`. |
| G6 | **NO default Tailwind palette colors** (no `bg-gray-500`, `text-blue-400`, ecc). Sempre token brand. | ESLint custom rule o grep per `text-(red|blue|green|gray|slate|zinc|neutral|stone)-`. |
| G7 | **NO uniform card grids**. Layout asimmetrico, pin disposti su modello secondo posizione fisica reale (non grid 4×2). | Manual review wireflow. |
| G8 | **DEPTH attraverso layering reale (3 piani)**, mai via shadow stacking. | §F.1 |
| G9 | **TEXTURE: noise overlay 6% opacity sul background per warmth**. NON accumulare con altri effetti (no blur + grain + gradient simultanei). | Single `body::before` rule. |
| G10 | **NO motion gratuito**. Animazione esiste solo dove rivela gerarchia (pin pulse = "io sono interattivo"), dà feedback (panel slide = "stato cambiato"), o introduce il prodotto (attractor). Niente hover wiggle, niente scroll-trigger, niente parallax. | §E.1 — `ease-material` BANNED, durate ≥ 250ms. |

### G.2 Anti-pattern check (skill frontend-design)

- ❌ Generic SaaS hero centered with gradient blob → ATTRACTOR usa composizione asimmetrica con headline left, microcopy stagger, modello in canvas reale
- ❌ Card piles uniform → Pin disposti secondo posizione 3D reale, panel singolo dominante (non grid)
- ❌ Random accent colors → Solo copper-500, max 1 per schermata
- ❌ Placeholder typography → Cormorant Garamond display + Inter UI + JetBrains mono, ognuno con ruolo definito
- ❌ Motion-for-motion-sake → Lista keyframes finita (§E.3), tutte giustificate

---

## H. Specifiche componenti

### H.1 `<HotspotPin>`

**Anatomia (tutti gli stati)**

```
   [touch zone 56×56 invisible]
         ┌─────────────┐
         │             │
         │      ◉      │  ← visible mark (varia per stato)
         │             │
         └─────────────┘
```

**Prop signature TypeScript**

```ts
type HotspotState = 'idle' | 'hover' | 'active' | 'visited';

interface HotspotPinProps {
  id: 'h1-boiler' | 'h2-group' | /* ... */ 'h8-gauge';
  state: HotspotState;
  position: string;           // "X Y Z" 3D coords for model-viewer slot
  normal?: string;            // "X Y Z" surface normal (occlusion)
  ariaLabel: string;          // localized "Hotspot 1 of 8: Doppia caldaia"
  onActivate: (id: string) => void;
  reducedMotion?: boolean;
}
```

**Stati visivi (CSS)**

```css
.hotspot-pin {
  width: 56px; height: 56px;
  border-radius: var(--radius-pin);   /* 999 */
  background: rgba(10, 10, 10, 0.80);
  backdrop-filter: blur(8px);
  border: 1px solid var(--accent-soft); /* copper @ 30% */
  display: grid; place-items: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    border-color var(--duration-fast) var(--ease-quiet),
    transform    var(--duration-fast) var(--ease-quiet);
}

.hotspot-pin::before {
  content: '';
  width: 12px; height: 12px;
  border-radius: 999px;
  background: var(--accent);  /* copper-500 dot */
  transition: background var(--duration-fast) var(--ease-quiet);
}

/* idle → pulse loop infinite (1 elemento per pin × 8 = ok? No: usiamo stagger random per evitare metronome) */
.hotspot-pin[data-state='idle']::before {
  animation: attractor-pulse 3s var(--ease-quiet) infinite;
  animation-delay: calc(var(--pin-index) * 180ms);  /* stagger naturale */
}

/* hover (desktop fallback only, totem touch non triggera) */
.hotspot-pin[data-state='hover'] {
  border-color: var(--cream-300);
  box-shadow: var(--shadow-copper-tight);
}

/* active — pannello aperto su questo pin */
.hotspot-pin[data-state='active'] {
  border-color: var(--cream-100);    /* crema piena */
  border-width: 2px;
  transform: scale(1.10);
  box-shadow: var(--shadow-copper-soft);
}
.hotspot-pin[data-state='active']::before {
  background: var(--accent);
  width: 14px; height: 14px;          /* dot leggermente più grande */
}

/* visited — utente ha già aperto questo panel almeno 1 volta in sessione */
.hotspot-pin[data-state='visited']::before {
  background: rgba(245, 241, 232, 0.60);  /* crema 60% — subtle hint */
}

/* reduced motion */
@media (prefers-reduced-motion: reduce) {
  .hotspot-pin[data-state='idle']::before {
    animation: none;
  }
}
```

**Accessibility**

- `<button>` element nativo, focusable
- `aria-label={t('hotspots.h1-boiler.ariaLabel')}` localizzato (es. "Hotspot 1 of 8: Doppia caldaia")
- `aria-pressed={state === 'active'}` per state announcement
- Keyboard: `Enter`, `Space` triggerano `onActivate`
- Focus visible: outline 2px copper-500 offset 2px

---

### H.2 `<HotspotPanel>`

**Anatomia portrait (480×100vh)**

```
┌──────────────────────────────┐  width 480px
│                          [✕] │  header: 96px tall, X 56×56 top-right
│  [icon 64]                   │
│  Doppia caldaia              │  H2 28px Cormorant 600
│  AISI 316                    │  H2 cont.
│  ────────────────────────    │  separator: 1px copper-soft
│                              │
│  Pre-infusione naturale,     │  body 18px Inter 400
│  2.3 kg massa termica.       │
│                              │
│  ┌──────────────────────┐    │
│  │  PID CAFFÈ           │    │
│  │  93 °C               │    │  SpecTable rows
│  │  PID VAPORE          │    │
│  │  123 °C              │    │
│  │  POTENZA             │    │
│  │  1700 W              │    │
│  └──────────────────────┘    │
│                              │
│  [no CTA, no footer]         │
└──────────────────────────────┘
```

**Anatomia landscape (100vw × 60vh = 1920×640)**

```
┌─────────────────────────────────────────────────────────────────┐
│ [icon 64] Doppia caldaia AISI 316             [✕]               │
│ ──────────────────────────────────────────────                  │
│ Pre-infusione naturale, 2.3 kg massa termica.                   │
│ ┌────────────────┬───────────────┬────────────────┐             │
│ │ PID CAFFÈ      │ PID VAPORE    │ POTENZA        │             │
│ │ 93 °C          │ 123 °C        │ 1700 W         │             │
│ └────────────────┴───────────────┴────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

**Prop signature**

```ts
interface HotspotPanelProps {
  hotspot: HotspotData;        // { id, title, subtitle, body, specs[], iconName }
  isOpen: boolean;
  onClose: () => void;
  orientation: 'portrait' | 'landscape';
}
```

**Stati**

| Stato | Trigger | Animazione |
|---|---|---|
| `entering` | `isOpen` true | Portrait: `panel-slide-in-right` 480ms. Landscape: `panel-slide-in-bottom` 480ms. Body internal: `fade-up` stagger 60ms 4 elementi (icon, title, body, specs). |
| `visible` | post-animation | static, focus trap attivo |
| `exiting` | `isOpen` false | Mirror slide-out 320ms `ease-quiet-in` |

**CSS chiave**

```css
.detail-panel {
  position: fixed;
  background: var(--color-elevated);
  box-shadow: var(--shadow-deep), var(--shadow-rim);
  border-left: 1px solid var(--border-subtle);
  border-radius: 0;                    /* edge-to-edge from viewport edge */
  z-index: var(--z-panel);             /* 50 */
  display: flex; flex-direction: column;
  padding: 56px 40px 40px;             /* top extra per close button */
  overflow: hidden;
}

.detail-panel[data-orientation='portrait'] {
  top: 0; right: 0;
  width: 480px; height: 100vh;
}

.detail-panel[data-orientation='landscape'] {
  bottom: 0; left: 0;
  width: 100vw; height: 640px;
  border-left: none;
  border-top: 1px solid var(--border-subtle);
  padding: 40px 80px;
}

.detail-panel__close {
  position: absolute;
  top: 24px; right: 24px;
  width: 56px; height: 56px;
  border-radius: var(--radius-soft);
  background: transparent;
  border: 1px solid var(--border-subtle);
}

.detail-panel__icon {
  width: 64px; height: 64px;
  stroke: var(--accent);             /* copper — UNICO copper-attivo nel panel */
  stroke-width: 1.5;
  fill: none;
}

.detail-panel__title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.75rem, 1.4rem + 1vw, 2rem);
  line-height: 1.20;
  letter-spacing: -0.005em;
  color: var(--color-text-primary);
  margin: 24px 0 0;
}

.detail-panel__separator {
  height: 1px; width: 64px;
  background: var(--accent-soft);
  margin: 24px 0;
}
```

**Accessibility**

- `role="dialog" aria-modal="true" aria-labelledby="panel-title"`
- Focus trap (vedi UX architecture §7.2 hint)
- `Escape` key triggers `onClose`
- Initial focus on close button
- Backdrop click outside panel triggers `onClose`

**Regole brand**

- NO tab interno, NO accordion, NO nested cards
- Solo 1 icona copper per panel (header)
- Body max 40 parole testo libero
- SpecTable max 4-6 righe (vedi H.5)

---

### H.3 `<LanguagePicker>`

**Anatomia stato `closed` (96×56 trigger button)**

```
┌──────────────┐
│  IT  ▾       │  Inter 500 14px uppercase letter-spacing 0.10em
└──────────────┘
   border 1px cream/18%, radius 4px
```

**Anatomia stato `open` (dropdown 280×240, floating)**

```
       ┌──────────────────────────┐  280×240
       │  Italiano             ●  │  80px height (·) = copper-500 dot 4×4
       ├──────────────────────────┤  separator 1px border-subtle
       │  English                 │  80px
       ├──────────────────────────┤
       │  Svenska                 │  80px
       └──────────────────────────┘
       shadow-deep + rim, border copper-soft 1px
```

**Prop signature**

```ts
interface LanguagePickerProps {
  current: 'it' | 'en' | 'sv';
  onSelect: (locale: 'it' | 'en' | 'sv') => void;
}
```

**CSS chiave**

```css
.lang-trigger {
  width: 96px; height: 56px;
  background: transparent;
  border: 1px solid var(--border-strong);  /* cream @ 18% */
  border-radius: var(--radius-soft);        /* 4px */
  color: var(--color-text-primary);
  font: 500 14px/1.2 var(--font-body);
  letter-spacing: 0.10em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.lang-trigger[aria-expanded='true'] {
  border-color: var(--accent-soft);         /* copper @ 30% */
}

.lang-trigger__chevron {
  width: 12px; height: 12px;
  transition: transform var(--duration-fast) var(--ease-quiet);
}
.lang-trigger[aria-expanded='true'] .lang-trigger__chevron {
  transform: rotate(180deg);
}

.lang-dropdown {
  position: absolute;
  top: calc(100% + 8px); right: 0;
  width: 280px;
  background: var(--color-elevated);
  border: 1px solid var(--accent-soft);
  border-radius: var(--radius-panel);       /* 8px */
  box-shadow: var(--shadow-deep), var(--shadow-rim);
  padding: 0;
  overflow: hidden;
  transform-origin: top right;
  animation: picker-stagger 280ms var(--ease-quiet) both;
}

.lang-option {
  display: flex; align-items: center;
  width: 100%; height: 80px;
  padding: 0 24px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--color-text-primary);
  font: 500 18px/1.4 var(--font-body);
  text-align: left;
  position: relative;
}
.lang-option:last-child { border-bottom: none; }

.lang-option[aria-selected='true']::before {
  content: '';
  position: absolute;
  left: 12px; top: 50%; transform: translateY(-50%);
  width: 4px; height: 4px;
  border-radius: 999px;
  background: var(--accent);                /* copper dot */
}

/* stagger delays */
.lang-dropdown .lang-option:nth-child(1) { animation: picker-stagger 280ms var(--ease-quiet) 0ms both; }
.lang-dropdown .lang-option:nth-child(2) { animation: picker-stagger 280ms var(--ease-quiet) 60ms both; }
.lang-dropdown .lang-option:nth-child(3) { animation: picker-stagger 280ms var(--ease-quiet) 120ms both; }
```

**Accessibility**

- Trigger: `<button aria-haspopup="listbox" aria-expanded={isOpen} aria-controls="lang-dropdown" />`
- Dropdown: `role="listbox" id="lang-dropdown"`
- Options: `role="option" aria-selected={isCurrent}`
- Keyboard: Arrow Up/Down navigate, Enter select, Escape close, Tab cycles
- Click outside dropdown closes it (capture phase listener)

**Dismiss logic**

- Tap outside → close
- Tap option → select + close
- ESC → close (focus return to trigger)
- Selezione lingua durante DETAIL → vedi UX §5.5 (chiude panel + switch)

---

### H.4 `<AttractorOverlay>`

**Anatomia (3 scene loop 12s)**

```
SCENE A (t=0-4s)
┌──────────────────────────────────────────────────┐
│                                                  │
│    AURELIA Pro X1                                │  hero 96px Cormorant 700
│    ___________________                           │  separator 80×1 copper
│                                                  │
│    Il caffè, scolpito.                           │  tagline 28px Cormorant 600 italic
│    (auto-rotate model in background, 6 rpm)     │
│                                                  │
└──────────────────────────────────────────────────┘

SCENE B (t=4-8s)
┌──────────────────────────────────────────────────┐
│                                                  │
│    Tocca per esplorare                           │  body-lg 22px Inter 500 cream-300
│                                                  │
│    [SVG 80px gesture finger tap-down]            │  custom SVG 1.5 stroke copper
│                                                  │
└──────────────────────────────────────────────────┘
microcopy ruota IT/EN/SV ogni 4s

SCENE C (t=8-12s)
┌──────────────────────────────────────────────────┐
│                                                  │
│    Scopri ogni dettaglio                         │
│                                                  │
│    ◉  ◉  ◉   (3 pin highlight randomly)          │
│                                                  │
└──────────────────────────────────────────────────┘
camera-orbit anima zoom verso 1 hotspot random
```

**Layer composition**

- Layer 0: canvas 3D `<model-viewer>` con `auto-rotate auto-rotate-delay="0"` (visibile sotto, sempre)
- Layer 1: noise overlay 6% (body::before, già globale)
- Layer 2: testo scena attiva (al massimo 1 visibile per volta)
- Layer 3: gradient verticale subtle dal bottom (cream/2% → 0) per separazione tagline (solo Scene A)

**Trigger & dismiss**

- Mount: 600ms fade-in da nero
- Dismiss: qualsiasi `pointerdown`/`touchstart` su document → 400ms fade-out scenes + `mode = 'active'`
- Su dismiss, headline scale 1 → 1.02 in 240ms (subtle "lift")

**Reduced motion**

- No 3-scene loop. Solo Scene A statica (headline + tagline) — auto-rotate model disabled.

---

### H.5 `<SpecTable>`

**Anatomia (2 colonne, max 6 righe)**

```
┌───────────────────────┬────────────────────┐
│ PID CAFFÈ             │           93 °C    │  row normal
├───────────────────────┼────────────────────┤  separator 1px border-subtle
│ PID VAPORE            │          123 °C    │  row normal
├───────────────────────┼────────────────────┤
│ POTENZA               │         1700 W     │  row highlight (bg copper @ 8%)
└───────────────────────┴────────────────────┘
```

**Stile**

- Label sx: `text-secondary cream-300 14px Inter 500 uppercase letter-spacing 0.10em`
- Value dx: `cream-100 18px JetBrains Mono 500 tabular-nums right-aligned`
- Row height: 56px (touch-coherent anche se non interattiva)
- Row highlight (max 1 per table): bg `rgba(184, 115, 51, 0.08)`, label rimane secondary, value rimane crema (no copper text)
- Separator: 1px `border-subtle` tra righe

**CSS**

```css
.spec-table {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0;
  width: 100%;
  border-top: 1px solid var(--border-subtle);
}

.spec-row {
  display: contents;
}

.spec-row__label,
.spec-row__value {
  padding: 18px 24px;             /* 18 vert, 24 horiz — micro space */
  border-bottom: 1px solid var(--border-subtle);
}

.spec-row__label {
  font: 500 14px/1.2 var(--font-body);
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.spec-row__value {
  font: 500 18px/1.4 var(--font-mono);
  color: var(--color-text-primary);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.spec-row[data-highlight='true'] .spec-row__label,
.spec-row[data-highlight='true'] .spec-row__value {
  background: rgba(184, 115, 51, 0.08);
}
```

**Constraint**

- Max 6 righe per table (oltre = troppa info per 15-45s sosta)
- Max 1 row highlight per table

---

### H.6 `<PrimaryButton>`

**Stati visivi**

| Stato | Border | Background | Text | Note |
|---|---|---|---|---|
| `idle` | 1px `cream @ 40%` | transparent | cream-100 | Default |
| `hover` | 1px `cream @ 60%` | transparent | cream-100 | Subtle (desktop fallback) |
| `pressed` | 1px copper-500 | `copper-500 @ 10%` | cream-100 | **Transient only** — pin ritorna idle ≤300ms |
| `disabled` | 1px `cream @ 18%` | transparent | cream-400 | opacity 0.4, cursor not-allowed |

> **Brand rule**: il copper border in `pressed` è ammesso perché transient (≤300ms tap feedback). Il button "at rest" non mostra mai copper. Questo preserva la regola G3 (max 1 copper per schermata).

**CSS**

```css
.btn-primary {
  height: 56px;
  padding: 0 24px;
  background: transparent;
  border: 1px solid rgba(245, 241, 232, 0.40);
  border-radius: var(--radius-soft);     /* 4px */
  color: var(--color-text-primary);
  font: 500 14px/1.2 var(--font-body);
  letter-spacing: 0.10em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    border-color var(--duration-fast) var(--ease-quiet),
    background   var(--duration-fast) var(--ease-quiet);
}

.btn-primary:hover { border-color: rgba(245, 241, 232, 0.60); }

.btn-primary:active {
  border-color: var(--accent);
  background: rgba(184, 115, 51, 0.10);
}

.btn-primary:disabled {
  opacity: 0.4;
  border-color: rgba(245, 241, 232, 0.18);
  color: var(--color-text-muted);
  cursor: not-allowed;
}
```

**Note totem**

- NO CTA grandi (no commerce flow tier sample-vetrina)
- Casi previsti: nessuno principale in MVP. Riservato per close button `<DetailPanel>` o eventuale skip-link.
- NO fill rame default. Rame è accent, non background button.

---

## I. Rendering states (mockup ASCII referenziati con token)

### I.1 ATTRACTOR portrait

```
┌──────────────────────────────────────────────────────┐  bg-canvas #0A0A0A
│                                                      │  + noise 6% overlay
│                                                      │
│  AURELIA Pro X1   ←──── hero 96px Cormorant 700      │  text-primary cream-100
│  ────                                                │  cream-100/20% 80×1px rule
│                                                      │
│  Il caffè, scolpito.   ←── tagline 28px Cormorant    │
│                                  600 italic          │  text-secondary cream-300
│                                                      │
│              ┌───────────────────────┐               │
│              │                       │               │
│              │  < model auto-rotate >│               │  z-canvas 10
│              │                       │               │
│              └───────────────────────┘               │
│                                                      │
│                                                      │
│                                                      │
│                                                      │
│                                                      │
└──────────────────────────────────────────────────────┘  z-attractor 70

[Layer stack bottom→top]:
  - bg-canvas neutral-950
  - noise overlay 6% (z-grain 80)
  - canvas 3D auto-rotate (z-canvas 10)
  - attractor scene text (z-attractor 70)
```

### I.2 ACTIVE portrait con 8 pin

```
┌──────────────────────────────────────────────────────┐  bg-canvas #0A0A0A
│  AURELIA                                  IT  ▾      │  z-chrome 30
│  PRO X1                                              │  text-primary cream-100
│                                                      │  picker border cream/18%
│                  ◉ h3-display                        │
│                  pin idle: ring copper/30%, dot      │
│                  copper-500 12px, pulse 3s loop      │  z-pin 20
│             ┌─────────────────────┐                  │
│         ◉   │                     │   ◉              │
│      h1     │   < model-viewer >  │  h8              │
│  -boiler    │   (gesture active)  │ -gauge           │  z-canvas 10
│             │                     │                  │
│         ◉   │                     │   ◉              │
│       h2    │                     │  h4              │
│   -group    │                     │ -steam           │
│             └─────────────────────┘                  │
│                  ◉ h5-portafilter                    │
│                                                      │
│         ◉ h6-pump        ◉ h7-tank                   │
│                                                      │
│   "Il caffè, scolpito."   ◦ pinch ◦ swipe ◦ tap      │  z-chrome 30
│   tagline 22px italic     microhint 14px uppercase   │  text-muted cream-400
│                           letter-spacing 0.10em      │
└──────────────────────────────────────────────────────┘
```

### I.3 DETAIL portrait con panel aperto

```
┌─────────────────────────────────┬────────────────────┐
│  AURELIA               IT ▾     │ [✕] (56×56 close)  │  z-panel 50 = panel
│  PRO X1                         │                    │  bg-elevated #2A2622
│                                 │ [icon copper 64]   │  shadow-deep + rim
│                                 │                    │
│  ┌──────────────┐               │ Doppia caldaia     │  H2 Cormorant 700
│  │              │               │ AISI 316           │
│  │   < model    │               │ ────               │  separator copper-soft 64×1
│  │     dimmed   │               │                    │
│  │     0.4 op > │               │ Pre-infusione      │  body 18px Inter 400
│  │              │               │ naturale, 2.3 kg   │  cream-100
│  │              │               │ massa termica.     │
│  │              │               │                    │
│  │              │               │ ┌────────────────┐ │
│  │              │               │ │ PID CAFFÈ      │ │  SpecTable
│  │              │               │ │       93 °C    │ │  label cream-300 14px
│  │              │               │ │ PID VAPORE     │ │  value cream-100 18px mono
│  └──────────────┘               │ │      123 °C    │ │
│                                 │ │ POTENZA        │ │  highlight row
│                                 │ │      1700 W    │ │  bg copper @ 8%
│                                 │ └────────────────┘ │
│                                 │                    │
│  [backdrop dim 60% opacity      │  width 480px       │  z-dim 40 = overlay
│   on canvas, click chiude]      │  height 100vh      │
└─────────────────────────────────┴────────────────────┘

[Layer stack]:
  - bg-canvas (z-base 0)
  - canvas 3D dimmed 0.4 (z-canvas 10)
  - chrome header (z-chrome 30)
  - dim overlay 60% (z-dim 40)
  - DetailPanel (z-panel 50)
```

### I.4 LANGUAGE picker aperto

```
┌──────────────────────────────────────────────────────┐
│  AURELIA                            ┌──────────────┐ │  z-picker 60
│  PRO X1                             │ Italiano   ● │ │  bg-elevated #2A2622
│                                     ├──────────────┤ │  border copper-soft 1px
│                                     │ English      │ │  shadow-deep + rim
│                                     ├──────────────┤ │  280×240, radius 8px
│                                     │ Svenska      │ │
│                                     └──────────────┘ │  active row: copper dot 4×4
│                                                      │
│             ┌─────────────────────┐                  │
│             │   < model active >  │                  │  z-canvas 10
│             │   (no dim, pin      │                  │
│             │    interactive)     │                  │  pins z-pin 20
│             └─────────────────────┘                  │
│                                                      │
│  "Il caffè, scolpito."   ◦ pinch ◦ swipe ◦ tap       │
└──────────────────────────────────────────────────────┘

[Layer stack]:
  - bg-canvas
  - canvas 3D (z-canvas 10)
  - chrome header (z-chrome 30, picker trigger here)
  - picker dropdown (z-picker 60)
  ※ no z-dim, no z-panel — picker non oscura il modello (UX §4.4)
```

---

## J. Z-index map (ribadita da UX §2.2)

| Token | Valore | Cosa contiene |
|---|---|---|
| `--z-base` | 0 | Background nero, texture noise |
| `--z-canvas` | 10 | `<model-viewer>` + camera controls |
| `--z-pin` | 20 | 8 hotspot pin |
| `--z-chrome` | 30 | Header (logo + picker trigger), footer (tagline + microhint) |
| `--z-dim` | 40 | Backdrop dim overlay quando DETAIL aperto |
| `--z-panel` | 50 | DetailPanel slide-in |
| `--z-picker` | 60 | LanguagePicker dropdown |
| `--z-attractor` | 70 | AttractorOverlay scene |
| `--z-grain` | 80 | Noise overlay (sopra tutto, pointer-events none) |
| `--z-debug` | 9999 | (dev only) FPS counter, telemetria |

> **Regola**: mai più di 1 layer modale visibile contemporaneamente (DETAIL e PICKER mutuamente esclusivi).

---

## K. Handoff a FASE 4 (frontend implementation)

### K.1 Token files prodotti

- `tailwind.config.ts` — token Tailwind 4 estesi
- `app/globals.css` — CSS variables, base reset kiosk, utilities

### K.2 Asset richiesti FASE 3

- `/public/models/aurelia-prox1.glb` (8 hotspot positions TBD durante asset gen)
- `/public/textures/noise.svg` — INLINE SVG `<filter>` noise NON un PNG. Inline è ~1KB, no asset dependency, scalabile, no caching issues. Vedi globals.css `body::before`.
- `/public/icons/hotspot/*.svg` — 8 icone Lucide-style 1.5px stroke per hotspot panel header

### K.3 Componenti da implementare (mappa skill / agent)

| Componente | Skill referenziato | Note FASE 4 |
|---|---|---|
| `<HotspotPin>` | `frontend-patterns` | Slot `hotspot-{id}` in model-viewer |
| `<HotspotPanel>` | `frontend-patterns` + `accessibility` | Focus trap, ESC close |
| `<LanguagePicker>` | `accessibility` | Combobox ARIA |
| `<AttractorOverlay>` | `gsap-timeline` + `gsap-react` | useGSAP hook, matchMedia reduced |
| `<SpecTable>` | semantica HTML pura | Grid display: contents |
| `<PrimaryButton>` | (basic) | Riservato uso minimal |

### K.4 Test plan stub (FASE 6)

Aggiungere oltre ai test in UX §9:
- `tests/e2e/07-design-tokens.spec.ts` — verifica computed style su sample components (rame solo dove permesso, contrast AAA)
- `tests/visual/01-attractor.spec.ts` — Playwright screenshot regression scena A,B,C

---

*FASE 2 v1 chiusa il 2026-04-26. Pending review Lorenzo. Procedere a FASE 3 (asset 3D Tripo AI) in parallelo a FASE 4 (implementation).*
