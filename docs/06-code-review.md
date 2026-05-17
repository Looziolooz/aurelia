# 06 - Code Review Pre-Demo: AURELIA Pro X1 Totem

> **Data review:** 2026-04-26  
> **Reviewer:** Claude Code (Sonnet 4.6)  
> **Scope:** Pre-demo prototype - branch master  
> **Constraint:** Read-only. Nessun fix automatico applicato.

---

## Sintesi per categoria

| # | Categoria | Stato | Note rapide |
|---|-----------|-------|-------------|
| 1 | TypeScript correctness | PASS | strict:true, no any, model-viewer.d.ts corretto |
| 2 | React patterns | WARN | console.error in prod; guard ridondante in LocaleHtmlLangSync |
| 3 | Next.js patterns | PASS | async params, generateStaticParams, Server/Client boundary corretta |
| 4 | Zustand state management | PASS | immutable Set pattern corretto, ReadonlySet tipizzato |
| 5 | GSAP patterns | FAIL | gsap.matchMedia() mancante; landscape slide non implementato |
| 6 | model-viewer integration | WARN | auto-rotate={false} renderizza come stringa truthy |
| 7 | i18n correttezza | PASS | parita chiavi confermata su 3 lingue; routing corretto |
| 8 | Performance | WARN | sessionStorage/prefetch locale mancante; skip-link non i18n |
| 9 | Security | PASS | nessun segreto hardcoded; robots noindex; nessun input utente |
| 10 | Anti-template design guardrails | PASS | token brand rispettati; copper usage entro limiti |
| 11 | Code quality | WARN | footer 12px sotto minimo; --pin-index mancante; LanguagePicker errato |
| 12 | Acceptance criteria SS.6 | WARN | 4 criteri non soddisfatti (reduced-motion, idle lock, lingua, PWA) |

---

## 1. TypeScript Correctness

**Stato: PASS**

- tsconfig.json: strict:true, moduleResolution:bundler - configurazione corretta.
- Nessun uso di any trovato nel codice applicativo.
- components/model-viewer.d.ts: augmentation JSX.IntrinsicElements per model-viewer corretta.
- TotemPhase union e ReadonlySet<string> per visitedHotspots: tipizzazione corretta.

---

## 2. React Patterns

**Stato: WARN**

### Issue R-1 - console.error in produzione [MEDIUM]

**File:** components/ProductViewer.tsx:34

Il fallback di errore model-viewer usa console.error. In produzione (kiosk) polluisce la console.
Fix: wrappare in process.env.NODE_ENV === 'development' oppure rimuovere.

### Issue R-2 - typeof document ridondante in Client Component [LOW]

**File:** components/LocaleHtmlLangSync.tsx

Il guard typeof document !== 'undefined' e sempre true in un Client Component. Dead code.

---
## 3. Next.js Patterns

**Stato: PASS**

- app/[locale]/layout.tsx: params tipizzato come Promise<{locale: string}> e awaited - corretto per Next.js 16.
- generateStaticParams esporta i 3 locale - build statica corretta.
- NextIntlClientProvider wrappa solo la parte client - boundary Server/Client rispettata.
- next.config.ts: withNextIntl applicato correttamente.
- Metadata con robots: { index: false, follow: false } - appropriato per kiosk demo.

---

## 4. Zustand State Management

**Stato: PASS**

- Pattern new Set(state.visitedHotspots).add(id) e immutabile e corretto con Zustand 5.
- enterActive ha guard contro chiamate da fase non-attractor - logica di state machine corretta.
- ReadonlySet<string> impedisce mutazione accidentale dall'esterno dello store.
- Store: 3 fasi + pickerOpen boolean separato - allineato con architettura a 4 stati del brief.

---

## 5. GSAP Patterns

**Stato: FAIL**

### Issue G-1 - GSAP ignora prefers-reduced-motion [HIGH]

**File:** components/AttractorOverlay.tsx, components/HotspotPanel.tsx

Il CSS guard in globals.css copre solo animation e transition CSS native.
Le chiamate gsap.to() / gsap.fromTo() bypassano completamente prefers-reduced-motion.
Il design system SS.E.4 e UX SS.7.3 richiedono gsap.matchMedia().

Pattern fix richiesto (entrambi i componenti):

    const mm = gsap.matchMedia()
    mm.add(
      { reducedMotion: '(prefers-reduced-motion: reduce)' },
      (context) => {
        const { reducedMotion } = context.conditions as { reducedMotion: boolean }
        if (reducedMotion) return
        // gsap timeline qui
      }
    )

### Issue G-2 - HotspotPanel: nessuna variante landscape slide-from-bottom [HIGH]

**File:** components/HotspotPanel.tsx:55-63

L'animazione GSAP usa sempre xPercent: 100 (slide from right).
Il brief SS.H.2 e UX SS.4.3 richiedono translateY in landscape.
Manca rilevamento via window.matchMedia('(orientation: landscape)').matches.

    const isLandscape = window.matchMedia('(orientation: landscape)').matches
    gsap.fromTo(panelRef.current,
      isLandscape ? { yPercent: 100 } : { xPercent: 100 },
      isLandscape ? { yPercent: 0 } : { xPercent: 0 }
    )

### Issue G-3 - HotspotPin: animate-attractor-pulse su span invisibile [HIGH]

**File:** components/HotspotPin.tsx:38-42

Il pulse e applicato a uno span senza background ne border.
Il keyframe scala un elemento trasparente. Il feedback visivo idle pin e rotto.

ATTUALE (rotto): <span className='absolute inset-0 rounded-full motion-safe:animate-attractor-pulse' />
FIX: aggiungere bg-copper-500/30 border border-copper-400/50 allo span.

---
## 6. model-viewer Integration

**Stato: WARN**

### Issue M-1 - auto-rotate={false} renderizza come stringa truthy [LOW]

**File:** components/ProductViewer.tsx:107

Gli attributi booleani HTML su web component funzionano per presenza/assenza.
auto-rotate={false} in JSX diventa auto-rotate='false' nel DOM - truthy per HTML.
FIX: usare auto-rotate={isAttractor || undefined} per rimuovere l'attributo.

### Issue M-2 - dynamic import con catch vuoto [INFO]

Il dynamic import di @google/model-viewer ha .catch(() => {}) vuoto. Consigliato loggare in development.

---

## 7. i18n Correttezza

**Stato: PASS**

- Parita chiavi confermata: product (5), attractor (5), ui (11), hotspot (8x{title,description,specs}), footer (2), a11y (5).
- Tutti i specKeys in data/hotspots.json hanno corrispondenza nei file messages.
- i18n/routing.ts: defineRouting con localePrefix:'always' - corretto per kiosk multilingua.
- i18n/request.ts: hasLocale validation prima del load messaggi - corretto.
- Middleware: matcher esclude _next e asset statici - corretto.

### Issue I-1 - Skip-link hardcoded in italiano [MEDIUM]

**File:** app/layout.tsx (Root Layout)

Il Root Layout non ha accesso al locale. Lo skip-link 'Vai al contenuto' e hardcoded in italiano,
impattando accessibilita per EN/SV. Soluzione: spostare in [locale]/layout.tsx.

---

## 8. Performance

**Stato: WARN**

### Issue P-1 - Nessuna persistenza sessionStorage locale [MEDIUM]

**File:** components/LanguagePicker.tsx (assenza)

UX SS.5.3 richiede sessionStorage per evitare revert al reload.
UX SS.5.4 richiede router.prefetch sui locale alternativi. Entrambi mancano.
Il criterio 'cambio lingua no flicker' e parzialmente non soddisfatto.

### Issue P-2 - Asset 3D placeholder [INFO]

Il modello .glb e placeholder. Da verificare in produzione: fetchpriority='high' per above-the-fold.

---

## 9. Security

**Stato: PASS**

- Nessun secret hardcoded trovato (API key, password, token).
- robots.json: noindex:true, nofollow:true - corretto per kiosk non indicizzabile.
- Nessuna query SQL, nessun input utente libero, nessuna operazione filesystem.
- Nessun dangerouslySetInnerHTML nel codebase.

### Issue S-1 - CSP headers non configurati [LOW]

next.config.ts non definisce Content-Security-Policy. Consigliato per produzione. Non bloccante per demo.

---
## 10. Anti-Template Design Guardrails

**Stato: PASS**

| Guardrail | Stato |
|-----------|-------|
| Nessun border-radius > 8px su pannelli | PASS - rounded-none per pannelli, rounded-sm per bottoni |
| Nessun shadow Material default | PASS - token shadow deep/copper-soft/copper-tight/rim usati |
| Nessun colore Tailwind default | PASS - solo neutral/copper/cream palette brand |
| Copper massimo 1 uso per schermata | WARN - HotspotPanel: icona copper + separatore accent-soft (borderline) |
| Nessuna icona emoji | PASS |
| Nessun border su card attractor | PASS |

---

## 11. Code Quality

**Stato: WARN**

### Issue Q-1 - Footer text-[12px] sotto minimo leggibilita [MEDIUM]

**File:** app/[locale]/page.tsx (footer)

Il brief SS.5 specifica 18px minimo per leggibilita a distanza kiosk. Il footer usa text-[12px].
Fix: almeno text-sm (14px) o text-base (16px).

### Issue Q-2 - LanguagePicker: dimensioni trigger errate [MEDIUM]

**File:** components/LanguagePicker.tsx

Il design system SS.H.3 specifica trigger 96x56px. Il componente usa w-14 h-14 (56x56px).
Larghezza mancante di 40px. Dropdown w-[180px] vs spec 280px.

### Issue Q-3 - LanguagePicker: usa animate-fade-up invece di animate-picker-stagger [MEDIUM]

**File:** components/LanguagePicker.tsx

tailwind.config.ts definisce animate-picker-stagger esattamente per il dropdown del language picker.
Il componente usa animate-fade-up generico, ignorando la stagger animation del design system.

### Issue Q-4 - HotspotPin: --pin-index mancante per stagger pulse [MEDIUM]

**File:** components/HotspotPin.tsx

Il design system SS.H.1 richiede --pin-index CSS custom property per staggerare il pulse per pin.
La prop index non viene tradotta in style={{ '--pin-index': index }}.

### Issue Q-5 - File sizes: tutti entro limiti [PASS]

Tutti i file sorgente sotto 800 linee (massimo: HotspotPanel.tsx ~179 righe).

### Issue Q-6 - Nessun test presente [WARN / prototipo]

Nessun file di test trovato. Accettabile per prototipo demo; >= 80% richiesto per produzione.

---

## 12. Acceptance Criteria - Brief SS.6

| Criterio | Stato | Note |
|----------|-------|------|
| Modello 3D caricabile e ruotabile | PASS | ProductViewer + dynamic import funzionante |
| 8 hotspot con panel dettaglio | PASS | hotspots.json + HotspotPin + HotspotPanel |
| Idle attractor loop (60s) | WARN | IdleResetProvider manca isAnimating lock + 4 eventi |
| 3 lingue senza reload visibile | WARN | sessionStorage + router.prefetch mancanti |
| Reduced-motion: nessuna animazione GSAP | FAIL | gsap.matchMedia() non implementato |
| Accessibilita focus-visible | PASS | outline copper + focus trap in HotspotPanel |
| Offline PWA / cache | FAIL | Non implementato nel prototipo |
| i18n parita chiavi | PASS | Confermata su 3 lingue |

---
## Issues per priorita

| ID | Priorita | Categoria | Descrizione | File |
|----|----------|-----------|-------------|------|
| G-3 | HIGH | GSAP | Pulse span invisibile - idle pin rotto visivamente | HotspotPin.tsx:38-42 |
| G-1 | HIGH | GSAP | gsap.matchMedia() mancante - prefers-reduced-motion ignorato | AttractorOverlay.tsx, HotspotPanel.tsx |
| G-2 | HIGH | GSAP | Landscape slide-from-bottom non implementato | HotspotPanel.tsx:55-63 |
| MV-1 | HIGH | ProductViewer | Double-tap su pin propaga al listener camera-reset | ProductViewer.tsx:64-71 |
| P-1 | MEDIUM | Performance | sessionStorage locale + router.prefetch mancanti | LanguagePicker.tsx |
| Q-1 | MEDIUM | Quality | Footer text-[12px] sotto minimo leggibilita 18px | page.tsx |
| Q-2 | MEDIUM | Quality | LanguagePicker trigger 56x56 (spec 96x56), dropdown 180px (spec 280px) | LanguagePicker.tsx |
| Q-3 | MEDIUM | Quality | animate-fade-up invece di animate-picker-stagger | LanguagePicker.tsx |
| Q-4 | MEDIUM | Quality | --pin-index CSS custom property mancante | HotspotPin.tsx |
| I-1 | MEDIUM | i18n | Skip-link hardcoded in italiano nel Root Layout | layout.tsx |
| ID-1 | MEDIUM | IdleReset | isAnimating lock mancante; 4 eventi idle mancanti | IdleResetProvider.tsx |
| R-1 | MEDIUM | React | console.error attivo in produzione | ProductViewer.tsx:34 |
| M-1 | LOW | model-viewer | auto-rotate={false} renderizza come stringa truthy | ProductViewer.tsx:107 |
| R-2 | LOW | React | typeof document guard ridondante | LocaleHtmlLangSync.tsx |
| S-1 | LOW | Security | CSP headers non configurati | next.config.ts |

---

## Acceptance Criteria Checklist - Brief SS.6

- [x] Modello 3D caricabile, ruotabile, zoomabile
- [x] 8 hotspot funzionanti con panel dettaglio
- [x] 3 lingue (IT/EN/SV) con i18n parita chiavi
- [x] Idle attractor overlay con loop (60s timer presente)
- [x] Focus-visible accessibilita (outline copper + focus trap in HotspotPanel)
- [ ] prefers-reduced-motion rispettato da GSAP - **MANCANTE**
- [ ] Cambio lingua senza flicker visibile (sessionStorage + prefetch) - **PARZIALE**
- [ ] Idle reset: isAnimating guard + tutti gli eventi - **PARZIALE**
- [ ] Offline PWA / service worker - **NON IMPLEMENTATO**

---

## Verdetto finale

**GO-WITH-FIXES**

Nessun problema CRITICAL di sicurezza o data-loss. 4 issue HIGH (3 GSAP + 1 event bubble) sono demo-visible
e devono essere risolti prima della presentazione cliente. 8 issue MEDIUM impattano fidelity rispetto al
design system e ai criteri di accettazione. i18n completa, TypeScript strict, Zustand corretto, nessun secret esposto.

**Top 3 fix bloccanti pre-demo:**
1. HotspotPin.tsx:38-42 - Aggiungere bg-copper-500/30 border border-copper-400/50 al pulse span (fix 1 riga)
2. AttractorOverlay.tsx + HotspotPanel.tsx - Implementare gsap.matchMedia() per prefers-reduced-motion
3. ProductViewer.tsx:64-71 - Bloccare event bubble double-tap su pin (check event.target o stopPropagation)

---

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 4 | warn |
| MEDIUM | 8 | warn |
| LOW | 3 | note |

**Verdict: GO-WITH-FIXES** - 4 HIGH issues devono essere risolti prima del demo.

---

*Review generata da Claude Code (Sonnet 4.6) - 2026-04-26 - read-only, nessun fix applicato automaticamente.*
