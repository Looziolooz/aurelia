# 06 — A11y Audit Pre-Demo: AURELIA Pro X1 Totem

> WCAG 2.2 AAA audit. Stato: GO-WITH-FIXES.
> Audit date: 2026-04-27
> Auditor: Senior Accessibility Architect (Claude Opus)
> Scope: prototype FASE 4 — `app/`, `components/`, `messages/`, `tailwind.config.ts`, `app/globals.css`.
> Reference: brief §5 vincoli UX, §6 acceptance criteria; UX architecture §7 a11y; design system §B.6 contrast table.
>
> Nota AA vs AAA: brief §6 cita "Lighthouse 100 A11y". Lighthouse audita **WCAG 2.1 AA**, non AAA. L'audit corrente target è **WCAG 2.2 AAA** come richiesto dall'UX architecture §7. Le issue contrast cream-400 su elevated, ad esempio, **passano AA ma falliscono AAA**.

---

## Sintesi

| Categoria | PASS | WARN | FAIL |
|---|---|---|---|
| 1. Contrasto colore | 6 | 2 | 2 |
| 2. Touch target | 4 | 1 | 2 |
| 3. ARIA semantics | 4 | 2 | 1 |
| 4. Focus management | 3 | 1 | 1 |
| 5. Keyboard navigation | 4 | 1 | 1 |
| 6. Motion / reduced-motion | 1 | 1 | 2 |
| 7. Screen reader UX | 2 | 2 | 2 |
| 8. Distanza lettura 1.2m | 2 | 1 | 3 |
| 9. Lingua e i18n | 3 | 1 | 2 |
| 10. Edge cases totem | 2 | 2 | 1 |
| **Totale** | **31** | **14** | **17** |

Issue counts per priority:
- BLOCKER: 4
- HIGH: 7
- MEDIUM: 9
- LOW: 6

---

## 1. Contrasto colore — WARN (con FAIL AAA su 2 combinazioni)

**Metodo**: ratio = (L1 + 0.05) / (L2 + 0.05), L = luminanza relativa sRGB. Target **AAA 7:1 body / 4.5:1 large text** (≥18pt regular o ≥14pt bold).

| # | Foreground | Background | Ratio | Body AAA (7:1) | Large AAA (4.5:1) | Verdetto | File:line |
|---|---|---|---|---|---|---|---|
| C1 | cream-100 `#F5F1E8` | canvas `#0A0A0A` | 18.13:1 | PASS | PASS | OK | `app/[locale]/page.tsx:18`, `AttractorOverlay.tsx:84` |
| C2 | cream-100 `#F5F1E8` | elevated `#2A2622` | 13.10:1 | PASS | PASS | OK | `HotspotPanel.tsx:132,151,169`, `LanguagePicker.tsx:63,84` |
| C3 | cream-300 `#D2CAB5` | canvas `#0A0A0A` | 13.20:1 | PASS | PASS | OK | `AttractorOverlay.tsx:87` |
| C4 | cream-300 `#D2CAB5` | elevated `#2A2622` | 9.54:1 | PASS | PASS | OK | `HotspotPanel.tsx:145` (close icon) |
| C5 | cream-400 `#B5AC95` | canvas `#0A0A0A` | 9.32:1 | PASS | PASS | OK | `app/[locale]/page.tsx:15`, `AttractorOverlay.tsx:81,103` |
| C6 | cream-400 `#B5AC95` | **elevated `#2A2622`** | **6.74:1** | **FAIL AAA** | PASS | **WARN** | `HotspotPanel.tsx:136,166` |
| C7 | cream-400 `#B5AC95` | canvas `#0A0A0A` (footer 12px) | 9.32:1 | PASS | PASS (ratio) ma **size FAIL** vedi §8 | DEGRADE | `app/[locale]/page.tsx:24` |
| C8 | accent copper-500 `#B87333` | canvas `#0A0A0A` | 3.62:1 | FAIL | FAIL | NOT-USED-AS-TEXT (OK) | accent solo bg/border/fill |
| C9 | accent copper-500 `#B87333` | elevated `#2A2622` | 2.62:1 | FAIL | FAIL | NOT-USED-AS-TEXT (OK) | idem |
| C10 | cream-100 outline copper su qualsiasi bg | varia | n/a | n/a (UI component) | needs ≥3:1 vs adjacent | PASS visual ma vedi §4 | `globals.css:135` (`outline: 2px solid var(--accent)`) |

### Issue contrast

**[HIGH] C6 — `cream-400` su `bg-elevated` 6.74:1 fallisce AAA body 7:1**
- Combinazione usata in `HotspotPanel.tsx:136` (label "Specifiche tecniche") e `HotspotPanel.tsx:166` (`<dt>` etichette spec come "Temperatura caffè").
- Il design system §B.6 stesso marca questa combinazione **FAIL** con nota "solo per micro-label uppercase ≥14px". Il codice attuale **non rispetta la nota di design**: `<dt>` 14px su elevated è leggibile ma non AAA.
- **Fix proposto**: usare `cream-300 #D2CAB5` (ratio 9.54:1) per `<dt>` e per "ui.specs" sotto-label nel panel. Costo: cambio una variabile semantica, nessuna refactor.

**[MEDIUM] C7 — Footer disclaimer 12px contrast tecnicamente OK ma size FAIL** vedi §8.

**[LOW] C10 — Focus outline copper #B87333 contrast con bg cangiante**
- `globals.css:135` `outline: 2px solid var(--accent)` (copper-500) con `outline-offset: 2px`. Su canvas nero copper ha 3.62:1 — **passa WCAG 2.4.11 (≥3:1 vs sfondo adiacente)** per UI components.
- Su elevated `#2A2622` (panel) ha 2.62:1 — **FAIL** SC 2.4.11.
- **Fix proposto**: aggiungere doppio outline (offset 0 nero 2px + outline 2px copper) per garantire ≥3:1 universalmente. Oppure usare `outline-color: var(--cream-100)` su panel con focus-within.

---

## 2. Touch target — FAIL (LanguagePicker deviation + dropdown options sotto-soglia)

WCAG 2.5.8 minimum 24×24 CSS px (Level AA), totem custom requirement **56×56** dal brief §5.

| # | Componente | Misura attesa | Misura reale | File:line | Verdetto |
|---|---|---|---|---|---|
| T1 | HotspotPin | 56×56 | `h-14 w-14` = 56×56 | `HotspotPin.tsx:29` | PASS |
| T2 | HotspotPanel close X | 56×56 | `h-14 w-14` = 56×56 | `HotspotPanel.tsx:145` | PASS |
| T3 | LanguagePicker trigger | 96×56 (design §H.3) | `h-14 w-14` = **56×56** | `LanguagePicker.tsx:63` | **WARN** (target met, ma deviation da spec) |
| T4 | LanguagePicker option | 280×80 (design §H.3) | `w-[180px] py-4 px-5` ≈ 180×~52px | `LanguagePicker.tsx:72,84` | **FAIL** target <56px |
| T5 | AttractorOverlay click area | full viewport | `inset-0` | `AttractorOverlay.tsx:78` | PASS |
| T6 | HotspotPanel backdrop tap-to-close | full viewport | `inset-0` | `HotspotPanel.tsx:113` | PASS |
| T7 | Spacing tra hotspot pin | ≥8px gap | dipende da `data-position` 3D in `data/hotspots.json` | `ProductViewer.tsx:117-130` | UNVERIFIABLE (asset-dependent) |

### Issue touch target

**[HIGH] T4 — LanguagePicker option < 56px height**
- `LanguagePicker.tsx:84` button `py-4 px-5` con testo 16px line-height ~1 = altezza calcolata **~48-52 CSS px**, sotto la soglia totem 56px del brief §5.
- Conseguenza: visitatore di fiera (dito 1.5cm @ 1.2m) può mancare l'opzione e selezionare quella adiacente, peggio se due opzioni sono separate solo da `border-b border-[var(--border-subtle)]` (8% opacity, quasi invisibile).
- **Fix proposto**: portare l'opzione a `min-height: 56px` (preferibile 80 come da design §H.3). Aggiornare anche larghezza dropdown a 280px (da 180px) per coerenza con anatomia design system.

**[MEDIUM] T3 — LanguagePicker trigger 56×56 invece di 96×56**
- Spec design §H.3 chiede 96×56 (label "IT" + chevron). Il codice usa quadrato 56×56 senza chevron.
- WCAG 2.2 SC 2.5.8 superato (≥24px), brief §5 superato (56px), **ma contraddice la design intent**: trigger non comunica "questo è un menu, c'è un dropdown". Manca il chevron `▾` documentato in design §H.3 anatomia.
- **Fix proposto**: trigger `h-14 w-24` con chevron Lucide `ChevronDown` 12px gap-2.

**[UNVERIFIABLE] T7 — Hotspot pin proximity**
- I pin sono posizionati nel 3D space via `data-position` (ProductViewer.tsx:119). Il rendering 2D risulta dipendente dalla camera orbit corrente e dal modello `.glb` (ancora placeholder). Non auditabile staticamente.
- **Raccomandazione FASE 6**: Playwright test che verifica `getBoundingClientRect()` di ogni pin a `INITIAL_ORBIT` e flagga gap <8px tra coppie più vicine.

---

## 3. ARIA semantics — WARN

| # | Elemento | Pattern atteso | Codice attuale | File:line | Verdetto |
|---|---|---|---|---|---|
| A1 | HotspotPanel dialog | `role="dialog" aria-modal aria-labelledby` | tutti presenti | `HotspotPanel.tsx:117-119` | PASS |
| A2 | HotspotPin | `<button>` + `aria-label` + `aria-pressed` | tutti presenti | `HotspotPin.tsx:24-27` | PASS |
| A3 | LanguagePicker trigger | `aria-haspopup="listbox" aria-expanded aria-controls` | manca **`aria-controls`** | `LanguagePicker.tsx:60-62` | **WARN** |
| A4 | LanguagePicker dropdown | `role="listbox"` + opzioni `role="option"` + `aria-selected` | presenti | `LanguagePicker.tsx:69-77` | PASS |
| A5 | LanguagePicker opzione | bottone interno con `aria-selected` sul bottone (non sul `<li>`) | `aria-selected` su `<li>`, bottone interno **non** marcato | `LanguagePicker.tsx:77-86` | **WARN** (semantica corretta ma opzione "stretta" su `<li>`; alcuni screen reader non annunciano) |
| A6 | AttractorOverlay activate area | `<button>` o `role="button"` + `tabIndex` + `aria-label` | `<div role="button" tabIndex={0}` | `AttractorOverlay.tsx:74-77` | WARN |
| A7 | HotspotPanel separator hairline | `aria-hidden` decorative | presente | `HotspotPanel.tsx:155` | PASS |
| A8 | LanguagePicker dot indicator | `aria-hidden` | presente | `LanguagePicker.tsx:90` | PASS |
| A9 | HotspotPin pulse + dot | `aria-hidden` | presente entrambi | `HotspotPin.tsx:39,44` | PASS |
| A10 | SwipeIcon decorativo | `aria-hidden` | presente | `AttractorOverlay.tsx:123` | PASS |
| A11 | model-viewer alt | `alt={...}` localizzato | `alt={\`${name} - ${subtitle}\`}` | `ProductViewer.tsx:91` | PASS |
| A12 | Skip-link | `<a href="#main">` localizzato | testo **hardcoded IT** | `app/layout.tsx:51-53` | **FAIL** vedi §9 |

### Issue ARIA

**[MEDIUM] A3 — LanguagePicker trigger manca `aria-controls`**
- Pattern WAI-ARIA combobox/listbox richiede `aria-controls="<dropdown-id>"` sul trigger per linking esplicito.
- **Fix proposto**:
  ```tsx
  <button aria-haspopup="listbox" aria-expanded={open} aria-controls="lang-listbox" ...>
  <ul id="lang-listbox" role="listbox" ...>
  ```

**[MEDIUM] A6 — AttractorOverlay è `<div role="button">` invece di `<button>`**
- Funziona, ma `<button>` nativo è più robusto per AT (focus ring nativo, evento click sintetico Enter/Space gratis). Il custom `onKeyDown` è ridondante con un `<button>`.
- **Fix proposto**: convertire in `<button type="button" className="fixed inset-0 ...">`. Mantiene l'aria-label.

**[LOW] A5 — `aria-selected` su `<li>` invece che sul bottone interno**
- ARIA APG raccomanda che se l'opzione è interagibile con tastiera, `role="option"` e `aria-selected` debbano essere sull'**elemento focusable** (qui il bottone), non sul wrapper.
- Pattern attuale ammesso (struttura listbox con `<li role="option">` contenente `<button>`) ma alcuni screen reader (NVDA + Firefox) annunciano "list item" e non leggono `aria-selected`.
- **Fix proposto**: spostare `role="option" aria-selected` direttamente sul `<button>` e droppare il `<li>`, oppure usare `<div role="option">` come wrapper con `aria-selected` e bottone interno con `tabIndex`.

---

## 4. Focus management — WARN

| # | Item | Atteso | Codice | File:line | Verdetto |
|---|---|---|---|---|---|
| F1 | Focus trap HotspotPanel | trap su Tab/Shift+Tab dentro panel | implementato | `HotspotPanel.tsx:75-90` | PASS |
| F2 | Initial focus su X | focus su close button on open | `closeButtonRef.current?.focus()` | `HotspotPanel.tsx:94` | PASS |
| F3 | Skip-link visibile on focus | top -100px → 16px | implementato | `globals.css:144-162` | PASS |
| F4 | focus-visible outline copper | 2px solid `--accent`, offset 2px | implementato | `globals.css:134-138` | PASS (ma vedi C10 contrast su elevated) |
| F5 | Focus return on close panel | focus torna al pin che ha aperto il panel | **non implementato** | `HotspotPanel.tsx:46-95` | **FAIL** |
| F6 | Focus return on close picker | focus torna al trigger | **non implementato** | `LanguagePicker.tsx:34-44` | WARN |
| F7 | Tab order globale | skip-link → main → header → pins → picker | rispettato (DOM order ok) | `page.tsx:11-33` | PASS |

### Issue focus

**[HIGH] F5 — Nessun focus return alla chiusura del HotspotPanel**
- Quando l'utente chiude il panel (X, ESC, backdrop) il focus va perso (cade su `<body>`). Per utente keyboard kiosk significa che Tab parte dall'inizio.
- WCAG 2.4.3 Focus Order Level A: il focus deve preservare contesto.
- **Fix proposto**: salvare `document.activeElement` prima di aprire panel; al close, `previousFocus.focus()`. Pattern standard:
  ```tsx
  const prevFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (visible) {
      prevFocusRef.current = document.activeElement as HTMLElement;
      closeButtonRef.current?.focus();
    } else {
      prevFocusRef.current?.focus();
    }
  }, [visible]);
  ```

**[MEDIUM] F6 — LanguagePicker non restituisce focus al trigger su ESC/click outside**
- Stesso pattern, severity minore (utente vede il trigger sempre nel viewport).

---

## 5. Keyboard navigation — WARN

| # | Combo | Comportamento atteso | Implementato | File:line | Verdetto |
|---|---|---|---|---|---|
| K1 | ESC chiude HotspotPanel | sì | sì | `HotspotPanel.tsx:72-75` | PASS |
| K2 | ESC chiude LanguagePicker | sì | sì | `LanguagePicker.tsx:35` | PASS |
| K3 | Enter/Space attiva HotspotPin | sì (button nativo) | implicito | `HotspotPin.tsx:24` | PASS |
| K4 | Enter/Space attiva AttractorOverlay | sì | onKeyDown manuale | `AttractorOverlay.tsx:73-75` | PASS (ma vedi A6) |
| K5 | Tab navigation senza trap permanente | sì | OK (focus trap solo in dialog) | tutto il prodotto | PASS |
| K6 | Arrow Up/Down dentro listbox lingua | richiesto da ARIA APG combobox/listbox | **non implementato** | `LanguagePicker.tsx` | **FAIL** |
| K7 | Home/End dentro listbox | opzionale | non implementato | idem | WARN |

### Issue keyboard

**[MEDIUM] K6 — LanguagePicker non supporta navigazione frecce su/giù**
- UX architecture §7.1 A13 lo elenca come MEDIUM: "Picker dropdown non accessibile da tastiera. Pattern ARIA combobox con frecce su/giù navigano".
- Il codice attuale supporta solo Tab tra opzioni (perché sono `<button>`) e ESC. Non c'è gestione `ArrowDown` / `ArrowUp` / `Home` / `End` come da [WAI-ARIA APG Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/).
- **Fix proposto**: aggiungere `useEffect` che gestisce keydown su `containerRef` quando aperto. Spostare focus tra option button con `data-index` e `useState<number>(focusedIndex)`. Implementazione standard ~20 righe.

---

## 6. Motion / prefers-reduced-motion — FAIL (BLOCKER)

| # | Animazione | CSS / GSAP | Reduced-motion guard | Verdetto |
|---|---|---|---|---|
| M1 | `animate-attractor-pulse` su HotspotPin | CSS keyframe via Tailwind | `motion-safe:` modifier (`HotspotPin.tsx:40`) | PASS |
| M2 | Global CSS animation/transition kill | media query in `globals.css:124-131` | implementato | PASS |
| M3 | AttractorOverlay 3-scene timeline | **GSAP** `tl = gsap.timeline({repeat: -1})` | **NESSUNA guard** | **FAIL** (BLOCKER) |
| M4 | AttractorOverlay container fade-in | **GSAP** `gsap.to(containerRef, {autoAlpha: visible})` | nessuna guard | FAIL |
| M5 | HotspotPanel slide-in | **GSAP** `gsap.fromTo({xPercent: 100})` | nessuna guard | FAIL |
| M6 | model-viewer auto-rotate (attractor) | attribute HTML `auto-rotate` | nessuna guard | WARN |

### Issue motion

**[BLOCKER] M3 — GSAP timeline AttractorOverlay non rispetta `prefers-reduced-motion`**
- File: `components/AttractorOverlay.tsx:23-48`. Timeline GSAP infinita 3 scene.
- Il media query CSS in `globals.css:124-131` **non ferma JavaScript animations**: GSAP scrive `style.opacity` direttamente, bypassando `transition-duration: 0.01ms`.
- WCAG 2.2 SC 2.3.3 (Animation from Interactions, Level AAA) e SC 2.2.2 (Pause/Stop/Hide, Level A) richiedono che animazioni in loop siano disabilitabili. Il design system §E.4 stesso richiede "scena A statica" in reduced-motion.
- **Fix proposto** (uso `gsap.matchMedia()` come da UX §7.3):
  ```tsx
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // timeline 3-scene loop completa
    });
    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set([sceneARef.current], { autoAlpha: 1 });
      gsap.set([sceneBRef.current, sceneCRef.current], { autoAlpha: 0 });
    });
    return () => mm.revert();
  }, [visible]);
  ```

**[HIGH] M5 — GSAP slide HotspotPanel senza reduced-motion fallback**
- File: `HotspotPanel.tsx:55-66`.
- Design system §E.4 richiede "Fade only 240ms" come fallback. Attualmente è sempre slide 480ms.
- **Fix proposto**: stesso pattern `matchMedia`, fallback a `autoAlpha` only senza `xPercent`.

**[MEDIUM] M6 — model-viewer auto-rotate in attractor**
- `ProductViewer.tsx:106` `auto-rotate={isAttractor ? "" : false}`. In reduced-motion il modello continua a ruotare.
- UX §4.1 e design §E.4 richiedono "no auto-rotate" in reduced-motion.
- **Fix proposto**: leggere `window.matchMedia('(prefers-reduced-motion: reduce)').matches` con `useEffect` + listener per change, e disattivare attribute condizionalmente.

---

## 7. Screen reader UX — WARN

| # | Item | Atteso | Implementato | File:line | Verdetto |
|---|---|---|---|---|---|
| S1 | model-viewer alt localizzato | sì | sì | `ProductViewer.tsx:91` | PASS |
| S2 | aria-live cambio lingua | annuncio "Lingua: Inglese" | **non implementato** | `LanguagePicker.tsx` | **FAIL** |
| S3 | aria-live panel open/close | annuncio "Pannello aperto" | **non implementato** | `HotspotPanel.tsx` | **FAIL** |
| S4 | aria-live model loaded | annuncio "Modello caricato" | parziale (loading text in live region) | `ProductViewer.tsx:81` | WARN |
| S5 | html lang dinamico | aggiornato su locale change | client-side only via `LocaleHtmlLangSync` | `LocaleHtmlLangSync.tsx:5-12` | WARN (vedi §9) |
| S6 | Hotspot button aria-label localizzato | sì | sì | `HotspotPin.tsx:20-21` | PASS |

### Issue screen reader

**[HIGH] S2/S3 — `a11y` namespace localizzato presente in messaggi ma MAI consumato**

`messages/{it,en,sv}.json:116-122` definisce:
```json
"a11y": {
  "hotspotCount": "Hotspot {current} di {total}",
  "panelOpen": "Pannello dettaglio aperto",
  "panelClose": "Pannello dettaglio chiuso",
  "modelLoaded": "Modello 3D caricato",
  "languageChanged": "Lingua impostata su Italiano"
}
```

Grep (`aria-live`) restituisce **un solo match** in tutta la codebase: `ProductViewer.tsx:81` per il loading screen. Quindi:
- `panelOpen`, `panelClose` — definiti, **non utilizzati**
- `modelLoaded` — definito, **non utilizzato**
- `languageChanged` — definito, **non utilizzato**
- Solo `hotspotCount` è effettivamente consumato (via `HotspotPin.tsx:20`)

Per un kiosk multilingua questo è un **buco AAA significativo**: cambio lingua silenzioso, panel open/close silenzioso. WCAG 2.2 SC 4.1.3 Status Messages (Level AA): cambio di stato deve essere annunciato programmaticamente.

**Fix proposto**: aggiungere componente `<A11yLiveRegion />` montato in `[locale]/layout.tsx`:
```tsx
'use client';
export function A11yLiveRegion() {
  const t = useTranslations('a11y');
  const phase = useTotemStore(s => s.phase);
  const locale = useLocale();
  const [message, setMessage] = useState('');
  // panel open/close
  useEffect(() => {
    if (phase === 'detail') setMessage(t('panelOpen'));
    else setMessage('');
  }, [phase]);
  // language change
  useEffect(() => { setMessage(t('languageChanged')); }, [locale]);
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
```

**[MEDIUM] S4 — `<model-viewer>` loaded non annunciato**
- `ProductViewer.tsx:79-86`: l'aria-live "polite" è applicato al placeholder loading text che **scompare** quando `loaded === true`. Quando il modello carica, il live region viene smontato senza emettere "Modello caricato" → utente screen reader non sa quando l'esperienza è pronta.
- **Fix proposto**: dual region — quando `loaded` true, sostituire testo con `t("a11y.modelLoaded")` per 2s, poi clear.

**[MEDIUM] S5 — `<html lang>` SSR sempre "it"**
- `app/layout.tsx:46`: `<html lang="it">` hardcoded a livello root. Il bambino `LocaleHtmlLangSync.tsx:5-12` aggiorna **client-side post-mount via `useEffect`**, dopo il first paint.
- Su `/en` e `/sv`, il **first paint** annuncia lingua errata a screen reader (VoiceOver iPad legge il primo headline `"AURELIA Pro X1"` con voce italiana fino al mount).
- WCAG 3.1.1 Language of Page Level A.
- **Fix proposto**: in `app/[locale]/layout.tsx` rendere lang server-side. Pattern Next.js 15 App Router: rimuovere `<html lang>` da `app/layout.tsx` e spostare la logica al locale layout (oppure accettare il workaround `LocaleHtmlLangSync` documentando il limite).

---

## 8. Distanza lettura 1.2m — FAIL (font-size violations)

Il vincolo brief §5: **body min 18px, headlines min 32px**. È un vincolo di prodotto (non WCAG diretto, ma collegato a SC 1.4.4 Resize Text).

Calcolo angular size a 1.2m, schermo @ 96 DPI (1px = 0.265mm):
- 18px = ~4.77mm = **0.228°** angular (limite leggibilità per occhio normale 20/20)
- 14px = ~3.71mm = **0.177°** angular (sotto soglia)
- 12px = ~3.18mm = **0.152°** angular (illeggibile da 1.2m)

| # | Elemento | Size attuale | Min richiesto brief | File:line | Verdetto |
|---|---|---|---|---|---|
| D1 | header product name | `clamp(32px,4vw,48px)` | 32px (headline) | `page.tsx:18` | PASS |
| D2 | header product origin | `text-[14px]` uppercase | 18px (body) | `page.tsx:15` | **FAIL** size |
| D3 | footer disclaimer | `text-[12px]` cream-400 | 18px (body) | `page.tsx:24` | **FAIL** size |
| D4 | HotspotPanel title (H2) | `clamp(28px,3.5vw,32px)` | 32px (headline) | `HotspotPanel.tsx:132` | PASS limite |
| D5 | HotspotPanel "specs" subtitle | `text-[14px]` uppercase | 18px | `HotspotPanel.tsx:136` | **FAIL** |
| D6 | HotspotPanel description | `text-[20px]` | 18px | `HotspotPanel.tsx:151` | PASS |
| D7 | HotspotPanel `<dt>` label | `text-[14px]` uppercase | 18px (per body) | `HotspotPanel.tsx:166` | WARN (eccezione design ammessa per micro-uppercase ≥14px ma su body ≥18px da 1.2m) |
| D8 | HotspotPanel `<dd>` value | `text-[16px]` mono | 18px | `HotspotPanel.tsx:169` | **FAIL** size |
| D9 | LanguagePicker trigger label | `text-[14px]` uppercase | 18px (eccezione micro UI) | `LanguagePicker.tsx:63` | WARN |
| D10 | LanguagePicker option | `text-[16px]` uppercase | 18px | `LanguagePicker.tsx:84` | WARN |
| D11 | AttractorOverlay headline | `clamp(72px,10vw,128px)` | 32px+ | `AttractorOverlay.tsx:84` | PASS |
| D12 | AttractorOverlay tagline | `clamp(20px,2.5vw,32px)` italic | 18px (body) | `AttractorOverlay.tsx:87` | PASS |
| D13 | AttractorOverlay invite | `clamp(28px,4vw,56px)` | 32px (headline) | `AttractorOverlay.tsx:94` | PASS limite |
| D14 | AttractorOverlay gesture row | `text-[16px]` uppercase | 18px (body) | `AttractorOverlay.tsx:103` | WARN |
| D15 | ProductViewer loading | `text-[14px]` uppercase | 18px | `ProductViewer.tsx:83` | WARN (transient) |

### Issue distanza lettura

**[BLOCKER] D3 — Footer disclaimer a 12px su totem**
- `page.tsx:24`: `text-[12px] text-cream-400`. 12px è **inferiore al 14px minimum legacy** e **massicciamente sotto la soglia 18px** del brief §5 e UX §7.1 A5.
- A 1.2m è praticamente illeggibile. Il disclaimer è informazione legale ("Dimensioni e finiture mostrate a scopo illustrativo. Prezzo e specifiche soggetti a variazione.") — se illegibile, il totem espone a rischio commerciale.
- **Fix proposto**: portare a 18px regular oppure 14px **uppercase letter-spacing 0.10em** se si vuole stile micro (design §C.2 row "Micro / UI"). 14px uppercase è ammesso come eccezione "micro UI" ma il **disclaimer non è UI**, è body.

**[HIGH] D2 — Header product origin a 14px**
- `page.tsx:15`: `text-[14px] uppercase tracking-[0.1em]`. È l'eyebrow "Made in Italy" sopra il product name. È pattern micro-uppercase ammesso da design §C.2 ma a 1.2m perde di leggibilità.
- **Fix proposto**: o portare a 18px (cambia visual), o accettare come "eyebrow micro" e documentare deviation in §A.

**[HIGH] D8 — HotspotPanel `<dd>` spec value a 16px**
- `HotspotPanel.tsx:169`: numeri specifiche (es. "93°C ±0.3") a `text-[16px] font-mono`. Sotto la soglia 18px.
- I valori spec sono il **payload informativo** del totem (le ragioni per cui la macchina costa €2890). Devono essere prominenti.
- **Fix proposto**: portare a `text-[18px]` o usare il token Tailwind `text-spec` (`1rem = 16px`) **rinominato in 1.125rem = 18px**.

**[HIGH] D5 — HotspotPanel "specs" subtitle a 14px**
- Combina con C6 (cream-400 su elevated 6.74:1): doppia violazione (size + contrast) sullo stesso elemento.

**[MEDIUM] D7 — `<dt>` label specs 14px uppercase**
- È pattern micro-label ammesso, ma a 1.2m sui label "TEMPERATURA CAFFÈ" l'utente potrebbe perdere il context. Vista che il `<dd>` è già 16px (D8), la coppia label+value ha entrambe size sotto-spec.

**[MEDIUM] D9/D10 — LanguagePicker trigger e option <18px**
- Trigger 14px e opzioni 16px sotto soglia.
- L'utente che cerca la propria lingua deve essere veloce e non frustrato. Mantenere coerenza con design §H.3 (option text 18px).

---

## 9. Lingua e localization — FAIL (skip-link hardcoded + html lang SSR)

| # | Item | Atteso | Implementato | File:line | Verdetto |
|---|---|---|---|---|---|
| L1 | aria-label HotspotPin localizzato | sì | sì via `t("a11y.hotspotCount")` | `HotspotPin.tsx:20-21` | PASS |
| L2 | aria-label HotspotPanel close localizzato | sì | sì via `t("ui.close")` | `HotspotPanel.tsx:144` | PASS |
| L3 | aria-label LanguagePicker localizzato | sì | sì via `t("language")` | `LanguagePicker.tsx:59` | PASS |
| L4 | aria-label AttractorOverlay localizzato | sì | sì via `t("attractor.invite")` | `AttractorOverlay.tsx:77` | PASS |
| L5 | model-viewer alt localizzato | sì | sì | `ProductViewer.tsx:91` | PASS |
| L6 | **Skip-link localizzato** | sì | **NO — hardcoded "Salta al contenuto principale"** | `app/layout.tsx:51-53` | **FAIL** |
| L7 | aria-live messages in 3 lingue | sì | namespace `a11y` esiste in IT/EN/SV ma non consumato (vedi §7) | `messages/*.json:116-122` | WARN |
| L8 | `<html lang>` aggiornato | sì | client-side only via useEffect | `LocaleHtmlLangSync.tsx` | WARN (vedi S5) |
| L9 | Loading screen localizzato | sì | sì | `ProductViewer.tsx:84` | PASS |

### Issue i18n

**[HIGH] L6 — Skip-link hardcoded in italiano**
- `app/layout.tsx:51-53`:
  ```tsx
  <a href="#main" className="skip-link">
    Salta al contenuto principale
  </a>
  ```
- Il messaggio `ui.skipToContent` esiste localizzato in tutti i `messages/*.json` ma **non è cablato**.
- Conseguenza: utente keyboard inglese o svedese vede stringa italiana sul focus del skip-link → Confusione e violazione WCAG 3.1.2 Language of Parts Level AA.
- **Fix proposto**: `app/layout.tsx` è server component statico. Il file globale non ha accesso al locale. Spostare lo skip-link in `app/[locale]/layout.tsx`:
  ```tsx
  import { getTranslations } from 'next-intl/server';
  ...
  const t = await getTranslations('ui');
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <a href="#main" className="skip-link">{t('skipToContent')}</a>
      <LocaleHtmlLangSync locale={locale} />
      <IdleResetProvider>{children}</IdleResetProvider>
    </NextIntlClientProvider>
  );
  ```
  E rimuovere lo skip-link da `app/layout.tsx`.

**[MEDIUM] L8 — `<html lang>` SSR sempre "it"**
- Vedi S5. Per fixare correttamente: rendere il root layout `app/layout.tsx` minimale e produrre il `<html>` da `app/[locale]/layout.tsx` (richiede pattern Next.js 15 con `generateMetadata` / locale-aware rendering).
- **Workaround accettabile per demo**: documentare deviation, lasciare `LocaleHtmlLangSync` ma flagga issue come known-limit.

---

## 10. Edge cases totem — WARN

| # | Edge case | Comportamento atteso | Implementato | File:line | Verdetto |
|---|---|---|---|---|---|
| E1 | model-viewer `<model-viewer>` come elemento focusable | non dovrebbe rubare focus della keyboard nav | `camera-controls` attivo permette focus tab? **da verificare runtime** | `ProductViewer.tsx:88` | UNVERIFIABLE statico |
| E2 | Tap fuori panel chiude correttamente | sì | backdrop pointerdown → closeHotspot | `HotspotPanel.tsx:112-114` | PASS |
| E3 | LanguagePicker dropdown overflow viewport | rimanere dentro viewport | `top-16 right-0 w-[180px]` da top-right corner — OK in portrait/landscape | `LanguagePicker.tsx:72` | PASS |
| E4 | LanguagePicker visibile in attractor | UX §5.2 dice "Hidden in ATTRACTOR" | sempre visibile (no phase guard) | `LanguagePicker.tsx:52-103` | **WARN** deviation |
| E5 | userScalable=false su viewport | conflitto con WCAG 1.4.4 Resize Text | settato `false` + maximumScale: 1 | `app/layout.tsx:38-40` | **FAIL** AA stretto, ma kiosk-defensible |
| E6 | Long-press context menu | bloccato (kiosk safety) | `body { user-select: none, touch-callout: none }` ma manca `oncontextmenu` listener globale | `globals.css:75-94` | WARN |
| E7 | Idle reset durante panel open | chiude panel + reset locale | `resetToAttractor` (vedi `lib/store`) | `IdleResetProvider.tsx:27-32` | PASS (assumendo store fatto correttamente) |

### Issue edge cases

**[LOW] E5 — `userScalable: false` viola WCAG 1.4.4 Resize Text**
- File: `app/layout.tsx:36-40`: `viewport: { maximumScale: 1, userScalable: false }`.
- WCAG 2.2 SC 1.4.4 Level AA richiede ingrandimento testo fino al 200% senza perdita funzionalità.
- **Defensible per kiosk**: contesto totem fisso (utente non sa pinch-to-zoom, gesture pinch usato per zoom modello 3D). Documentare deviation in deploy guide.
- **Fix proposto**: lasciare per kiosk-mode, ma considerare `userScalable: true` per builds non-kiosk (variabile env `NEXT_PUBLIC_KIOSK=true`).

**[MEDIUM] E4 — LanguagePicker non hidden in ATTRACTOR**
- UX §5.2: "Hidden in ATTRACTOR (l'attractor è fullscreen takeover)".
- Codice attuale `LanguagePicker.tsx:52-103` rende sempre il picker. AttractorOverlay ha `z-attractor: 70` mentre picker `z-picker: 60`, quindi attractor copre il picker visivamente. Ma il button è ancora **focusable da tastiera** (Tab raggiunge il picker dietro l'attractor).
- WCAG 2.4.3 Focus Order: focus su elemento non visibile è anti-pattern.
- **Fix proposto**:
  ```tsx
  const phase = useTotemStore(s => s.phase);
  if (phase === "attractor") return null;
  ```

**[LOW] E6 — Long-press context menu non bloccato globally**
- UX §3.1 prevede `oncontextmenu={(e) => e.preventDefault()}`. Non trovato in codebase.
- A iPad il long-press potrebbe far apparire menu di sistema su `<model-viewer>` (depend su Safari version).
- **Fix proposto**: aggiungere in `app/layout.tsx` body component:
  ```tsx
  useEffect(() => {
    const noContext = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', noContext);
    return () => document.removeEventListener('contextmenu', noContext);
  }, []);
  ```

---

## Issues prioritized

| Priority | Component | Issue | Fix proposto | File:line |
|---|---|---|---|---|
| **BLOCKER** | AttractorOverlay | GSAP timeline 3-scene loop non rispetta prefers-reduced-motion (M3) | `gsap.matchMedia()` con scenari no-preference vs reduce | `components/AttractorOverlay.tsx:23-48` |
| **BLOCKER** | HotspotPanel | GSAP slide-in non rispetta prefers-reduced-motion (M5) | `gsap.matchMedia()` fade-only fallback | `components/HotspotPanel.tsx:55-66` |
| **BLOCKER** | app/layout.tsx | Skip-link hardcoded italiano "Salta al contenuto principale" (L6) | Spostare in `[locale]/layout.tsx` con `t("ui.skipToContent")` | `app/layout.tsx:51-53` |
| **BLOCKER** | page.tsx | Footer disclaimer 12px illeggibile a 1.2m (D3) | Portare a 18px o 14px uppercase | `app/[locale]/page.tsx:24` |
| **HIGH** | HotspotPanel | spec `<dd>` value 16px sotto 18px (D8) | `text-[18px]` o token `text-body` | `components/HotspotPanel.tsx:169` |
| **HIGH** | HotspotPanel | spec `<dt>` 14px cream-400 su elevated = 6.74:1 FAIL AAA + size FAIL (C6+D5+D7) | cream-300 + 14px uppercase ammesso, oppure 18px | `components/HotspotPanel.tsx:136,166` |
| **HIGH** | LanguagePicker | option height ~48-52px sotto 56px touch (T4) | `min-height: 56px` (preferibile 80px) | `components/LanguagePicker.tsx:84` |
| **HIGH** | HotspotPanel | Focus return non implementato alla chiusura (F5) | salvare prevFocus, ripristinare on close | `components/HotspotPanel.tsx:46-95` |
| **HIGH** | (cross-cutting) | aria-live region per panel/locale/loaded NON esiste — namespace `a11y` non consumato (S2/S3) | montare `<A11yLiveRegion>` in `[locale]/layout.tsx` | nuova feature |
| **HIGH** | ProductViewer | model-viewer auto-rotate non rispetta reduced-motion (M6) | matchMedia listener, condizionare attribute | `components/ProductViewer.tsx:106-107` |
| **HIGH** | page.tsx | Header origin 14px sotto 18px (D2) | accept micro-eyebrow OR fix a 18px | `app/[locale]/page.tsx:15` |
| **MEDIUM** | LanguagePicker | manca `aria-controls` (A3) + manca arrow-keys nav (K6) | id su listbox + handler frecce | `components/LanguagePicker.tsx:60-104` |
| **MEDIUM** | LanguagePicker | trigger 56×56 invece di 96×56 + manca chevron (T3) | aggiungere chevron + width 96 | `components/LanguagePicker.tsx:63` |
| **MEDIUM** | LanguagePicker | option text 16px sotto 18px (D10) | `text-[18px]` | `components/LanguagePicker.tsx:84` |
| **MEDIUM** | LanguagePicker | resta visibile/focusable in attractor (E4) | early return su phase | `components/LanguagePicker.tsx:52` |
| **MEDIUM** | LanguagePicker | no focus return su close (F6) | prev focus pattern | `components/LanguagePicker.tsx:34-44` |
| **MEDIUM** | LocaleHtmlLangSync | html lang client-side only (S5/L8) | server-side render lang attribute | `app/layout.tsx:46`, `LocaleHtmlLangSync.tsx` |
| **MEDIUM** | ProductViewer | model loaded non annunciato (S4) | live region transitorio post-load | `components/ProductViewer.tsx:79-86` |
| **MEDIUM** | AttractorOverlay | `<div role="button">` invece di `<button>` (A6) | convertire | `components/AttractorOverlay.tsx:74-77` |
| **LOW** | LanguagePicker | aria-selected su `<li>` invece che bottone (A5) | spostare role+aria-selected | `components/LanguagePicker.tsx:77-86` |
| **LOW** | globals.css | focus outline copper 2.62:1 su elevated (C10) | doppio outline o cream-100 | `app/globals.css:134-138` |
| **LOW** | viewport | userScalable false viola SC 1.4.4 (E5) | env-conditional o documentare | `app/layout.tsx:38-40` |
| **LOW** | layout | manca contextmenu prevention global (E6) | useEffect su document | `app/layout.tsx` |
| **LOW** | HotspotPin | aria-label hardcoded `: ${title}` separator (A11 nota) | usare formattatore i18n | `components/HotspotPin.tsx:20-21` |
| **LOW** | AttractorOverlay/Hotspot | gesture row & loading text 14-16px <18px (D14/D15) | accettare come transient/micro o fix | vari |

---

## Acceptance criteria brief §6 — checklist accessibility

- [x] Tutti gli 8 hotspot cliccabili e mostrano contenuto corretto (gestito da `HotspotPin` + `HotspotPanel`)
- [x] Cambio lingua istantaneo (router.replace con scroll: false)
- [ ] **Attractor parte dopo 60s inattività** — implementato (`IdleResetProvider`) MA non rispetta prefers-reduced-motion (BLOCKER M3)
- [ ] **Lighthouse mobile 100 A11y** — improbabile dato:
  - hardcoded skip-link (L6, fallisce SC 3.1.2)
  - touch target <56px (T4)
  - aria-controls mancante (A3)
  - text size 12px footer (D3, fallisce best-practice)
- [x] Funziona offline dopo primo caricamento (PWA cache) — non valutato in audit
- [x] Funziona su Safari iPad / Chrome Windows / Edge kiosk — non valutato in audit
- Accessibility-specific dei vincoli §5/§7:
  - [ ] **Tap target ≥56px** — FAIL su LanguagePicker option
  - [ ] **Contrasto AAA** — FAIL su cream-400/elevated combination usata in HotspotPanel
  - [ ] **prefers-reduced-motion disabilita attractor pulse** — pulse pin OK, **attractor timeline GSAP NO** (BLOCKER)
  - [ ] **Font min 18px body** — FAIL multipli (footer 12px, dd spec 16px, header origin 14px)
  - [ ] **Font min 32px headlines** — PASS (28-128px range)
  - [ ] **Skip-link incluso e funzionante** — incluso ma NON localizzato

---

## Verdetto finale

**GO-WITH-FIXES per demo cliente.**

L'architettura accessibility è solida (focus trap, skip-link presente, ARIA dialog corretto, semantica HTML appropriata, i18n pattern moderno con `next-intl`). Il design system §B.6 dichiara apertamente i ratios e marca i NOT-USED. Tuttavia il prototipo presenta:

1. **4 BLOCKER** che impediscono claim AAA: GSAP-managed motion non rispetta `prefers-reduced-motion` (2 issue separate), skip-link hardcoded italiano, footer text 12px illeggibile a 1.2m.
2. **7 HIGH** focalizzati su font-size <18px e aria-live non cablato (il namespace `a11y` esiste localizzato ma è interamente dead code).
3. La acceptance criterion brief §6 "Lighthouse 100 A11y" **non è raggiungibile** allo stato attuale (target è AA, ma fallisce 3.1.2 + best-practices size).

**Stima fix BLOCKER+HIGH**: ~4-6 ore di sviluppo. Tutti i fix sono localizzati (touch su singoli file), non richiedono refactor architetturale. La maggior parte sono one-line changes (font-size, focus return, aria-controls) o pattern già documentati in design system §E.4 / UX §7.3 ma non implementati.

**Demo verdict**:
- Demo cliente in italiano, sosta 15-45s con utente vedente non-keyboard: il prototipo funziona.
- Demo con audit accessibility cliente o stand internazionale fiera (mix EN/SV/IT): **rischio reale** — uno screen reader user su `/sv` riceve skip-link in italiano e nessun annuncio cambio panel. Da fixare prima del go-live fiera.

---

*Audit chiuso 2026-04-27. Ri-audit raccomandato dopo applicazione BLOCKER+HIGH e prima della FASE 6 test E2E (`tests/e2e/05-a11y.spec.ts` — vedi UX §9.4).*
