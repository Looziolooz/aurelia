# OPENCODE.md — Setup OpenCode per AURELIA Pro X1

> Guida step-by-step per configurare OpenCode (sst/opencode) come tool advisor/parallelo a Claude Code, con memoria persistente e subagent agganciati al vault Obsidian.
> **Path vault**: `C:/Users/loren/Desktop/obsidian vault/`
> **Path progetto**: `C:/Users/loren/Desktop/dev-projects/AURELIA Pro X1/`

---

## Indice

0. [Divisione del lavoro Claude Code ↔ OpenCode](#0-divisione-del-lavoro)
1. [Step 1 — Installazione OpenCode](#step-1--installazione-opencode)
2. [Step 2 — Init progetto + AGENTS.md](#step-2--init-progetto--agentsmd)
3. [Step 3 — Memoria persistente agganciata al vault](#step-3--memoria-persistente)
4. [Step 4 — MCP servers (filesystem vault + altri)](#step-4--mcp-servers)
5. [Step 5 — Subagent personalizzati](#step-5--subagent-personalizzati)
6. [Step 6 — Custom commands per il progetto](#step-6--custom-commands)
7. [Step 7 — Cartella progetto nel vault Obsidian](#step-7--cartella-progetto-nel-vault)
8. [Step 8 — Bootstrap script automatico](#step-8--bootstrap-script-automatico)
9. [Step 9 — Workflow tipico di una sessione](#step-9--workflow-tipico-di-sessione)
10. [Troubleshooting](#troubleshooting)

---

## 0. Divisione del lavoro

| Fase del progetto | Tool primario | Tool secondario |
|---|---|---|
| FASE 1 — UX architecture | **Claude Code** (`ux-architect`) | OpenCode rivede dopo |
| FASE 2 — UI design tokens | **Claude Code** (`ui-designer` + skill `frontend-design`) | OpenCode genera anti-template checklist |
| FASE 3 — Asset 3D (Tripo AI) | Manuale | **OpenCode** genera prompt Midjourney |
| FASE 4 — Implementazione | **Claude Code** (`frontend-developer` + skill `threejs-skills`) | OpenCode review componenti |
| FASE 5 — Copy IT/EN/SV | **OpenCode** (`copywriter-trilingue`) | Claude Code rilegge per consistenza |
| FASE 6 — Test E2E Playwright | **OpenCode** (`fiera-tester`) | Claude Code esegue/debug |
| FASE 7 — Review pre-demo | Entrambi (adversarial dual-review) | — |

**Convenzione commit per tracciare chi ha fatto cosa**:
- Claude Code → `feat:`, `fix:`, `refactor:`
- OpenCode → `docs:`, `test:`, `copy:`, `chore:`
- Filter: `git log --grep="^copy:"` per vedere solo lavoro OpenCode.

---

## Step 1 — Installazione OpenCode

OpenCode (sst/opencode) è il CLI agent open-source. Installazione su Windows:

```powershell
# Opzione A: Scoop (raccomandato Windows)
scoop install opencode

# Opzione B: npm globale
npm install -g opencode-ai

# Opzione C: Bun globale (coerente con stack progetto)
bun install -g opencode-ai
```

Verifica:
```bash
opencode --version
```

Login (se usi modelli Anthropic, Z.ai, OpenRouter, ecc.):
```bash
opencode auth login
```

Imposta il modello di default (consiglio Sonnet 4.6 o Opus 4.7 per coding):
```bash
opencode models
# poi seleziona anthropic/claude-sonnet-4-6
```

---

## Step 2 — Init progetto + AGENTS.md

OpenCode usa `AGENTS.md` come Claude Code usa `CLAUDE.md`. È supportato nativamente.

```bash
cd "C:/Users/loren/Desktop/dev-projects/AURELIA Pro X1"
opencode init
```

Questo genera:
- `AGENTS.md` (project-level)
- `.opencode/` (config dir)

**Sostituisci `AGENTS.md` con questo template**:

```markdown
# AGENTS.md — AURELIA Pro X1

## Identità progetto

Progetto: **Totem digitale fiera AURELIA Pro X1** (macchina espresso prosumer).
Tier: €6k-10k 3D model-viewer.
Hardware target: iPad Pro 12.9" portrait (1080×1920) + Windows kiosk.
Lingue: IT (default), EN, SV.

## Lingua di interazione
Rispondi sempre a Lorenzo in **italiano**.
Codice, commit message, doc tecnica → **inglese**.

## Tool team
Lavoro a coppia con **Claude Code**. Vedi sezione "Divisione del lavoro" in @./OPENCODE.md.
Source of truth condivisa: vault Obsidian (vedi sotto).

## Memoria persistente — vault Obsidian

Il vault è `C:/Users/loren/Desktop/obsidian vault/`. Riferimenti chiave:

- @../../obsidian vault/Everything Claude Code/00 - Home ECC.md (entry point ECC)
- @../../obsidian vault/Everything Claude Code/_source/skills/ (skill source originali)
- @../../obsidian vault/Progetti/AURELIA Pro X1/ (cartella progetto live)

Quando ho bisogno di contesto su skill, agent, o decisioni passate:
1. Leggi il file vault corrispondente con `read`
2. Se un wrapper italiano del vault è thin, leggi anche `_source/`
3. Se l'info non c'è, **chiedimi** invece di inventare

## Project brief
@./docs/00-brief.md (la guida originale del progetto)
@./docs/01-ux-architecture.md (output FASE 1)
@./docs/02-ui-design-system.md (output FASE 2)
@./data/hotspots.json (gli 8 hotspot)
@./data/product.json (specs prodotto)

## Brand AURELIA (locked)

Palette:
- Nero profondo `#0A0A0A` (background primario)
- Rame brunito `#B87333` (accent — max 1 elemento copper per schermata)
- Crema avorio `#F5F1E8` (testi)
- Grigio caldo `#2A2622` (surface secondaria)

Typography:
- Display: **Cormorant Garamond** (700, 600)
- UI: **Inter** (400, 500, 600)
- Mono: **JetBrains Mono**

Tone of voice:
- IT: elegante, artigianale, evocativo, frasi brevi
- EN: refined, crafted, confident, short sentences
- SV: stilren, hantverksmässig, lugn, korta meningar

## Anti-template guardrails (CRITICAL)

NO bordi arrotondati > 8px sui pannelli.
NO ombre Material Design.
NO gradient generici.
NO "AI-generic phrasing" tipo "unleash the power of...".
USA copper come accent **sparingly** (max 1 elemento per schermata).

## Stack tecnico (locked)

- Next.js 15 + React 19 + TypeScript strict
- Tailwind CSS 4 + design tokens custom
- `@google/model-viewer` (NO React Three Fiber per questo tier)
- GSAP 3 + `@gsap/react`
- next-intl
- Zustand
- Bun 1.3.x
- Playwright

## Cosa NON fare

- Mai committare `.env`, segreti, API key
- Mai bypassare hook pre-commit con `--no-verify` senza istruzione esplicita
- Mai modificare file in `_source/` del vault (read-only)
- Mai rispondere in inglese se la domanda è in italiano
- Mai installare dipendenze non in stack locked sopra senza conferma
```

---

## Step 3 — Memoria persistente

OpenCode supporta tre layer di memoria:

| Layer | File | Scope | Caricato |
|---|---|---|---|
| Globale utente | `~/.config/opencode/AGENTS.md` | Tutti i progetti | Sempre |
| Progetto | `./AGENTS.md` | Solo progetto corrente | Sempre |
| Riferimento | `@path/to/file` dentro AGENTS.md | On-demand | Quando referenziato |

### 3.1 Memoria globale agganciata al vault

Crea `~/.config/opencode/AGENTS.md` (o `%USERPROFILE%\.config\opencode\AGENTS.md` su Windows):

```markdown
# AGENTS.md globale — Lorenzo

## Identità
- Lorenzo Savant, italiano, base Svezia
- Email: lorenzo@savantmedia.se
- Lingua interazione: **italiano sempre**
- Tool team: Claude Code + OpenCode in parallelo

## Vault Obsidian (source of truth)
Path: `C:/Users/loren/Desktop/obsidian vault/`

Reference principali:
- @C:/Users/loren/Desktop/obsidian vault/Everything Claude Code/00 - Home ECC.md
- @C:/Users/loren/Desktop/obsidian vault/Everything Claude Code/01 - Fondamenti/I 5 Principi Fondamentali.md
- @C:/Users/loren/Desktop/obsidian vault/Progetti/ (cartella progetti live)

## I 5 Principi Fondamentali (always-on)

1. **Agent-First** — delega a subagent specializzati
2. **Test-Driven** — test prima del codice, coverage 80%+
3. **Security-First** — valida input, proteggi segreti
4. **Immutability** — nuovi oggetti, mai mutation in-place
5. **Plan Before Execute** — piano è artefatto, non improvvisazione

## Token economy
- Haiku 4.5 → esplorazione, edit triviali
- Sonnet 4.6 → 90% del coding (default)
- Opus 4.7 → architettura, security critical

## Cosa NON fare globalmente
- Mai committare segreti
- Mai modificare `_source/` del vault
- Mai rispondere in inglese a domande italiane
```

### 3.2 Memoria progetto

Già fatto allo Step 2 con `AGENTS.md` del progetto.

### 3.3 Persistenza session-to-session via vault

OpenCode di default **non** ha memoria cross-session. Per simulare la `memory/` di Claude Code, usa il vault come storage:

Crea nel vault: `Progetti/AURELIA Pro X1/_opencode-memory/`

Files:
- `decisions.md` — decisioni prese in sessioni precedenti
- `feedback.md` — correzioni che Lorenzo ha dato (non ripetere errori)
- `current-state.md` — stato del lavoro a fine ultima sessione

Riferiscili in `AGENTS.md` con:
```markdown
## Memoria cross-session
@../../obsidian vault/Progetti/AURELIA Pro X1/_opencode-memory/decisions.md
@../../obsidian vault/Progetti/AURELIA Pro X1/_opencode-memory/feedback.md
@../../obsidian vault/Progetti/AURELIA Pro X1/_opencode-memory/current-state.md
```

A fine sessione, esegui il comando `/checkpoint` (lo creiamo allo Step 6).

---

## Step 4 — MCP servers

OpenCode supporta MCP. Configurali in `.opencode/opencode.json` (project) o `~/.config/opencode/opencode.json` (globale).

### 4.1 Filesystem vault (essenziale)

Permette a OpenCode di leggere/scrivere il vault Obsidian come tool MCP nativo:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "vault": {
      "type": "local",
      "command": [
        "bunx",
        "@modelcontextprotocol/server-filesystem",
        "C:/Users/loren/Desktop/obsidian vault"
      ],
      "enabled": true
    }
  }
}
```

Test: in OpenCode chiedi "leggi `Everything Claude Code/00 - Home ECC.md`". Se risponde con il contenuto, MCP funziona.

### 4.2 Obsidian REST API (opzionale, più potente)

Richiede plugin Obsidian **Local REST API** installato e attivo (genera API key):

```json
{
  "mcp": {
    "obsidian": {
      "type": "local",
      "command": ["bunx", "obsidian-mcp-server"],
      "environment": {
        "OBSIDIAN_API_KEY": "{env:OBSIDIAN_API_KEY}",
        "OBSIDIAN_HOST": "http://127.0.0.1:27123"
      },
      "enabled": true
    }
  }
}
```

Vantaggio rispetto a filesystem MCP: supporta search full-text, tag query, dataview, manipolazione properties YAML.

### 4.3 Context7 (docs library)

Per consultare doc Three.js, GSAP, Next.js senza inventare API:

```json
{
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/sse",
      "enabled": true
    }
  }
}
```

### 4.4 GitHub (per cercare implementazioni)

```json
{
  "mcp": {
    "github": {
      "type": "local",
      "command": ["bunx", "@modelcontextprotocol/server-github"],
      "environment": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "{env:GITHUB_TOKEN}"
      },
      "enabled": true
    }
  }
}
```

### 4.5 Config file completo `.opencode/opencode.json`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-6",
  "small_model": "anthropic/claude-haiku-4-5",
  "theme": "tokyonight",
  "autoshare": false,
  "autoupdate": true,
  "mcp": {
    "vault": {
      "type": "local",
      "command": ["bunx", "@modelcontextprotocol/server-filesystem", "C:/Users/loren/Desktop/obsidian vault"],
      "enabled": true
    },
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/sse",
      "enabled": true
    }
  }
}
```

---

## Step 5 — Subagent personalizzati

OpenCode supporta subagent in `.opencode/agent/<nome>.md` (project) o `~/.config/opencode/agent/<nome>.md` (globale).

Crea **3 subagent dedicati al progetto**:

### 5.1 `copywriter-trilingue`

File: `.opencode/agent/copywriter-trilingue.md`

```yaml
---
description: Genera copy IT/EN/SV con tone of voice AURELIA. Usa quando bisogna scrivere o rivedere stringhe in messages/{it,en,sv}.json.
mode: subagent
model: anthropic/claude-sonnet-4-6
temperature: 0.6
tools:
  read: true
  write: true
  edit: true
  bash: false
---

Sei copywriter trilingue specializzato in product copy lusso italiano.

# Context obbligatorio

Carica prima di scrivere:
- @./AGENTS.md (sezione Brand AURELIA)
- @./docs/00-brief.md (sezione 2 — identità prodotto)
- @C:/Users/loren/Desktop/obsidian vault/Everything Claude Code/_source/skills/brand-voice/SKILL.md (se esiste)

# Tone of voice

| Lingua | Vibe | Lunghezza frase | Esempi parole-chiave |
|---|---|---|---|
| Italiano | elegante, artigianale, evocativo | 6-12 parole | scolpito, materia, gesto, pausa |
| English | refined, crafted, confident | 6-10 words | sculpted, crafted, deliberate, calm |
| Svenska | stilren, hantverksmässig, lugn | 5-9 ord | skulpterad, gedigen, lugn, ren |

# Vincoli hard

- Max **40 parole** per descrizione hotspot
- Numeri tecnici **identici tra lingue** (93°C resta 93°C, non "93 degrees")
- NO AI-generic phrasing: "unleash the power", "revolutionary", "next-level", "game-changing"
- NO punto esclamativo nelle descrizioni
- NO emoji
- Headline prodotto max 5 parole

# Output format

Scrivi sempre i 3 file insieme: `messages/it.json`, `messages/en.json`, `messages/sv.json`.
Mantieni le stesse chiavi i18n nelle 3 lingue (Lorenzo verifica con diff visuale).

# Workflow

1. Leggi `data/hotspots.json` per le 8 specifiche
2. Leggi `data/product.json` per identità prodotto
3. Genera copy in IT prima
4. Traduci in EN mantenendo cadenza simile
5. Traduci in SV adattando sintassi (verbi al primo posto è ok)
6. Mostra a Lorenzo i 3 file in diff format prima di scrivere
```

### 5.2 `threejs-reviewer`

File: `.opencode/agent/threejs-reviewer.md`

```yaml
---
description: Review codice Three.js / model-viewer / GSAP per performance, correctness, memory leak. Usa dopo ogni modifica a components/ProductViewer.tsx, HotspotPin.tsx, o file animation.
mode: subagent
model: anthropic/claude-opus-4-7
tools:
  read: true
  bash: true
  edit: false
  write: false
---

Sei expert reviewer Three.js / model-viewer / GSAP per esperienze totem fiera.

# Context obbligatorio

- @C:/Users/loren/Desktop/obsidian vault/Everything Claude Code/_source/skills/threejs-skills/ (se esiste)
- @C:/Users/loren/Desktop/obsidian vault/Everything Claude Code/_source/skills/gsap/SKILL.md (se esiste)
- @./AGENTS.md
- @./docs/00-brief.md (sezione 9 troubleshooting)

# Checklist review (in ordine)

## 1. Asset 3D
- [ ] GLB peso < 4MB (`ls -lh public/models/*.glb`)
- [ ] Draw calls < 30 (verifica con devtools Three.js inspector)
- [ ] Texture max 2048px, formato webp
- [ ] Hotspot data-position dentro/su mesh corretta (no posizioni fluttuanti)

## 2. model-viewer config
- [ ] camera-orbit min/max bounds settati
- [ ] interaction-prompt disabled (gestiamo noi)
- [ ] poster con fade in caricamento
- [ ] dynamic import client-only (`{ ssr: false }`)
- [ ] Fallback WebGL non disponibile

## 3. GSAP cleanup (CRITICAL — memory leak fiera)
- [ ] Ogni `gsap.timeline()` ha `.kill()` in cleanup useEffect
- [ ] `useGSAP` hook usato dove possibile (auto-cleanup)
- [ ] Nessun ScrollTrigger sospeso (`.kill(true)`)
- [ ] Listener `addEventListener` rimossi in cleanup

## 4. Touch performance
- [ ] No `transition` CSS durante drag/gesture
- [ ] `transform: translate3d()` invece di top/left
- [ ] `will-change: transform` solo su elementi attivamente animati
- [ ] `touch-action: none` su gesture custom

## 5. Three.js dispose (se R3F)
- [ ] `geometry.dispose()` su unmount
- [ ] `material.dispose()` su unmount
- [ ] `texture.dispose()` su unmount
- [ ] `renderer.dispose()` su unmount

## 6. Accessibilità totem
- [ ] Tap target ≥ 56px (computed)
- [ ] aria-label localizzato sui pin
- [ ] `prefers-reduced-motion` → disabilita pulse/attractor

# Output

Report markdown in `docs/reviews/threejs-{ISO_DATE}.md` con:
- Status PASS / WARN / FAIL per ogni checklist item
- Code snippet del problema con file:line
- Fix suggerito (NON applicare, solo proporre)
- Priorità: BLOCKER / HIGH / MEDIUM / LOW

Aggiungi backref nel vault: `Progetti/AURELIA Pro X1/_opencode-memory/reviews-log.md`
```

### 5.3 `fiera-tester`

File: `.opencode/agent/fiera-tester.md`

```yaml
---
description: Genera test Playwright touch-emulation per scenari fiera totem (8 hotspot, i18n, idle reset, memory leak 12h). Usa quando bisogna creare/aggiornare tests/e2e/.
mode: subagent
model: anthropic/claude-sonnet-4-6
tools:
  read: true
  write: true
  edit: true
  bash: true
---

Sei test engineer specializzato in kiosk/totem touch testing.

# Context obbligatorio

- @C:/Users/loren/Desktop/obsidian vault/Everything Claude Code/_source/skills/e2e-testing/ (se esiste)
- @./AGENTS.md
- @./docs/00-brief.md (sezione 5 — testing fiera-ready, sezione 8 — acceptance criteria)
- @./data/hotspots.json (gli 8 hotspot da testare)

# Device target

Playwright project default: `iPad Pro 12.9` portrait
Project secondario: `Desktop Chrome` 1920×1080 landscape (Windows kiosk)

# Test obbligatori

## tests/e2e/hotspots.spec.ts
Per ognuno degli 8 hotspot da `data/hotspots.json`:
1. Tap → verifica panel visibile entro 500ms
2. Verifica titolo i18n IT corretto
3. Verifica almeno 4 specs nel pannello
4. Tap close → verifica panel chiuso entro 500ms
5. Verifica solo 1 panel aperto alla volta (apri 2 in sequenza, primo deve chiudersi)
Bonus: doppio tap su area vuota → camera resettata.

## tests/e2e/i18n.spec.ts
- Apri picker, switch a EN → verifica headline cambiata
- Switch a SV → verifica headline cambiata
- Reload page → verifica persistenza locale (sessionStorage)
- Wait 61s no-touch → verifica reset a IT

## tests/e2e/idle-reset.spec.ts
- Apri hotspot → wait 61s no-touch → verifica attractor visibile
- Verifica timeline attractor riparte da Scene A
- Touch → attractor scompare entro 300ms

## tests/e2e/accessibility.spec.ts
- axe-core scan: 0 violazioni serious/critical
- Tutti tap target ≥ 56px (computed size)
- Contrasto testo body ≥ 7:1 (AAA)
- Tab navigation funzionante (kiosk fallback)

## tests/e2e/memory-leak.spec.ts
Simulato (no 12h reali):
- Apri/chiudi 8 hotspot per 50 cicli
- `page.evaluate(() => performance.memory.usedJSHeapSize)` prima/dopo
- Aspetta che heap non cresca > 30% (margine GC)
- Force GC tra cicli con `Performance.measureUserAgentSpecificMemory()` se disponibile

# Config

Genera `playwright.config.ts` con:
```ts
projects: [
  { name: 'iPad Pro 12.9 portrait', use: { ...devices['iPad Pro 12.9'] } },
  { name: 'iPad Pro 12.9 landscape', use: { ...devices['iPad Pro 12.9 landscape'] } },
  { name: 'Desktop Chrome 1920', use: { viewport: { width: 1920, height: 1080 } } }
]
```

# Output

- File test in `tests/e2e/*.spec.ts`
- Config in `playwright.config.ts`
- Report acceptance criteria coverage in `docs/reviews/test-coverage-{ISO_DATE}.md`
```

---

## Step 6 — Custom commands

OpenCode supporta slash command in `.opencode/command/<nome>.md`.

### 6.1 `/checkpoint` — Salva stato in vault

File: `.opencode/command/checkpoint.md`

```markdown
---
description: Salva stato attuale della sessione nella memoria vault per riprenderla dopo
---

Esegui questi step in ordine:

1. **Riassumi cosa abbiamo fatto in questa sessione** (3-5 bullet)

2. **Lista decisioni prese** con timestamp:
   - Decisione + perché
   - File toccati

3. **Salva in** `C:/Users/loren/Desktop/obsidian vault/Progetti/AURELIA Pro X1/_opencode-memory/current-state.md`:
   ```markdown
   # Current state — AGGIORNATO {ISO_DATE}

   ## Done
   - ...

   ## In progress
   - ...

   ## Next 3 task suggeriti
   1. ...
   2. ...
   3. ...

   ## Open questions
   - ...

   ## Last session summary
   {summary 5 bullet}
   ```

4. **Append a** `_opencode-memory/decisions.md`:
   ```markdown
   ## {ISO_DATE} — Sessione OpenCode
   - Decisione X (perché)
   - Decisione Y (perché)
   ```

5. **Conferma a Lorenzo** mostrando i file scritti.

Quando ricomincia una nuova sessione, leggi prima `current-state.md` per resume.
```

### 6.2 `/sync-vault` — Sync project state

File: `.opencode/command/sync-vault.md`

```markdown
---
description: Sincronizza stato progetto con cartella vault Obsidian
---

Aggiorna nel vault `Progetti/AURELIA Pro X1/`:

1. **`01-Stato.md`** — Kanban inline:
   ```markdown
   ## Backlog
   - [ ] task X

   ## In progress
   - [ ] task Y

   ## Done
   - [x] task Z (data)
   ```
   Source: `git log --oneline` ultime 30 commit + working tree status.

2. **`02-Asset.md`** — tracking asset:
   - Modello GLB: status (mancante / generato Tripo / ottimizzato / calibrato)
   - Peso file, draw calls
   - Lista 8 hotspot con coords confermate
   - Logo SVG + 8 icone status
   - Font self-hosted status
   - Copy IT/EN/SV % completamento

3. **`03-Open-Questions.md`** — append nuove domande aperte (dedup).

4. **`04-Riferimenti.md`** — link a skill ECC usate in questa sessione (con backref).

Mostra a Lorenzo il diff prima di scrivere.
```

### 6.3 `/handoff-claude` — Handoff a Claude Code

File: `.opencode/command/handoff-claude.md`

```markdown
---
description: Prepara handoff strutturato per quando Lorenzo passa a Claude Code
---

Quando Lorenzo deve passare a Claude Code (es. per implementazione 3D che è meglio fare lì):

1. Genera `HANDOFF.md` nella root progetto:
   ```markdown
   # Handoff a Claude Code — {ISO_DATE}

   ## Stato attuale
   {output di /sync-vault sezione Stato}

   ## File modificati in working tree
   {git status --short}

   ## Decisioni recenti (ultime 10)
   {git log --oneline -10}

   ## Cosa Claude Code dovrebbe fare next
   1. ...
   2. ...
   3. ...

   ## Blocker / open questions
   - ...

   ## Context da caricare in Claude Code
   - @./AGENTS.md (uguale formato a CLAUDE.md, leggibile)
   - @./docs/00-brief.md
   - @./docs/01-ux-architecture.md
   - @./docs/02-ui-design-system.md
   - @./HANDOFF.md (questo file)
   ```

2. Suggerisci a Lorenzo il prompt Claude Code:
   > "Apri Claude Code in C:/Users/loren/Desktop/dev-projects/AURELIA Pro X1
   > e digita: leggi @HANDOFF.md e procedi con il task 1."

3. NON committare HANDOFF.md (è working state). Aggiungi a `.gitignore` se non c'è.
```

### 6.4 `/tripo-pipeline` — Asset 3D workflow

File: `.opencode/command/tripo-pipeline.md`

```markdown
---
description: Workflow asset 3D da prompt MJ a GLB ottimizzato + hotspot calibrati
---

Pipeline asset 3D AURELIA Pro X1 step-by-step:

## Step 1 — Genera prompt Midjourney/Flux
Output 4 prompt diversi per 4 angoli:
- Front straight-on
- 3/4 left
- 3/4 right  
- Back

Ogni prompt deve includere:
- "Premium Italian dual-boiler espresso machine"
- "brushed stainless steel body with brushed copper accents and walnut wood handle"
- "matte black base, professional E61 group head, 4-inch touch display"
- "photorealistic studio lighting, white background, product photography"

Salva i 4 prompt in `assets/refs/prompts.md`.

## Step 2 — Lorenzo conferma
Aspetta che Lorenzo metta le 4 immagini in `assets/refs/{front,3q-left,3q-right,back}.png`.
Verifica con `ls assets/refs/*.png`. Se mancano, **fermati**.

## Step 3 — Istruzioni Tripo AI
Stampa istruzioni per Lorenzo:
1. Vai a https://tripo3d.ai
2. Login → Multi-image to 3D
3. Upload 4 immagini in ordine
4. Style: Realistic
5. Quality: Standard (per prototipo) o HD (se demo finale)
6. Wait ~30s
7. Download GLB → metti in `assets/raw/aurelia-prox1-raw.glb`

## Step 4 — Ottimizzazione
Esegui:
```bash
mkdir -p public/models
npx @gltf-transform/cli optimize \
  assets/raw/aurelia-prox1-raw.glb \
  public/models/aurelia-prox1.glb \
  --texture-compress webp \
  --texture-size 2048 \
  --simplify
```

Verifica:
- `ls -lh public/models/aurelia-prox1.glb` < 4MB
- Apri https://gltf.report/ e carica → check draw calls < 30

## Step 5 — Calibrazione hotspot
Istruzioni per Lorenzo:
1. Vai a https://modelviewer.dev/editor/
2. Drag GLB ottimizzato
3. Per ognuno degli 8 hotspot in `data/hotspots.json`, click sul mesh nel punto giusto
4. Copia `data-position` e `data-normal` dal pannello destro
5. Aggiorna `data/hotspots.json` con coords nuove

## Step 6 — Update vault
Aggiorna `Progetti/AURELIA Pro X1/02-Asset.md` con:
- Peso finale GLB
- Draw calls
- Status: "Ottimizzato e calibrato — pronto per FASE 4"
```

---

## Step 7 — Cartella progetto nel vault

Crea questa struttura nel vault Obsidian:

```
C:/Users/loren/Desktop/obsidian vault/Progetti/AURELIA Pro X1/
├── 00-Brief.md                    # link/copy del docs/00-brief.md
├── 00-Decisioni.md                # log decisioni con date e tool autore
├── 01-Stato.md                    # Kanban inline
├── 02-Asset.md                    # tracking asset 3D + 2D + copy
├── 03-Open-Questions.md           # domande aperte da decidere
├── 04-Riferimenti.md              # backref skill ECC + paper + articoli
├── 05-Demo-Script.md              # cosa dire al cliente in fiera
└── _opencode-memory/
    ├── current-state.md           # stato fine ultima sessione
    ├── decisions.md               # append-only log decisioni
    ├── feedback.md                # correzioni Lorenzo (non ripetere errori)
    └── reviews-log.md             # backref tutte le review threejs-reviewer
```

**Frontmatter consigliato per `00-Brief.md`** (così Obsidian Bases/Properties lo indicizza):

```yaml
---
project: AURELIA Pro X1
status: in-progress
tier: 6k-10k
hardware: ipad-portrait
locales: [it, en, sv]
deadline: 2026-05-15
tools: [claude-code, opencode]
tags: [progetti/totem-fiera, project/active, fase/setup]
---
```

Quando una fase finisce, aggiorna il tag: `fase/ux-done`, `fase/ui-done`, ecc.

---

## Step 8 — Bootstrap script automatico

Crea `bootstrap-opencode.sh` nella root progetto. **Esegui una volta** per setup completo:

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(pwd)"
VAULT_DIR="C:/Users/loren/Desktop/obsidian vault"
PROJECT_NAME="AURELIA Pro X1"
VAULT_PROJECT_DIR="$VAULT_DIR/Progetti/$PROJECT_NAME"

echo "🚀 Bootstrap OpenCode per $PROJECT_NAME"

# 1. Verifica OpenCode installato
if ! command -v opencode &> /dev/null; then
  echo "❌ opencode non trovato. Installa con: scoop install opencode"
  exit 1
fi

# 2. Init OpenCode se serve
[ ! -f AGENTS.md ] && opencode init

# 3. Crea cartelle progetto vault
mkdir -p "$VAULT_PROJECT_DIR/_opencode-memory"

# 4. Skeleton vault notes (se non esistono)
for f in "00-Brief" "00-Decisioni" "01-Stato" "02-Asset" "03-Open-Questions" "04-Riferimenti" "05-Demo-Script"; do
  target="$VAULT_PROJECT_DIR/$f.md"
  if [ ! -f "$target" ]; then
    cat > "$target" <<EOF
---
project: $PROJECT_NAME
status: in-progress
tools: [claude-code, opencode]
tags: [progetti/totem-fiera, project/active]
created: $(date -Iseconds)
---

# $f

EOF
    echo "📝 creato $target"
  fi
done

# 5. Skeleton memory files
for f in "current-state" "decisions" "feedback" "reviews-log"; do
  target="$VAULT_PROJECT_DIR/_opencode-memory/$f.md"
  [ ! -f "$target" ] && echo "# $f" > "$target" && echo "🧠 creato memory $target"
done

# 6. Crea .opencode/ struttura
mkdir -p .opencode/agent .opencode/command

# 7. Config opencode.json se non esiste
if [ ! -f .opencode/opencode.json ]; then
  cat > .opencode/opencode.json <<EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-6",
  "small_model": "anthropic/claude-haiku-4-5",
  "theme": "tokyonight",
  "autoshare": false,
  "mcp": {
    "vault": {
      "type": "local",
      "command": ["bunx", "@modelcontextprotocol/server-filesystem", "$VAULT_DIR"],
      "enabled": true
    },
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/sse",
      "enabled": true
    }
  }
}
EOF
  echo "⚙️  creato .opencode/opencode.json"
fi

# 8. .gitignore
if ! grep -q "^HANDOFF.md" .gitignore 2>/dev/null; then
  cat >> .gitignore <<'EOF'

# OpenCode working files
HANDOFF.md
.opencode/cache/
EOF
  echo "🙈 aggiornato .gitignore"
fi

echo ""
echo "✅ Setup completato!"
echo ""
echo "Prossimi step manuali:"
echo "  1. Copia subagent template da OPENCODE.md Step 5 in .opencode/agent/"
echo "  2. Copia command template da OPENCODE.md Step 6 in .opencode/command/"
echo "  3. Apri OpenCode: opencode"
echo "  4. Test memoria: 'leggi $VAULT_DIR/Everything Claude Code/00 - Home ECC.md'"
```

Esegui:
```bash
chmod +x bootstrap-opencode.sh
./bootstrap-opencode.sh
```

---

## Step 9 — Workflow tipico di sessione

### Apertura sessione

```bash
cd "C:/Users/loren/Desktop/dev-projects/AURELIA Pro X1"
opencode
```

Primo messaggio in chat:
> "Leggi `_opencode-memory/current-state.md` dal vault e dimmi da dove riprendiamo."

### Durante la sessione

- Per copy: `@copywriter-trilingue scrivi headline e attractor IT/EN/SV`
- Per review: `@threejs-reviewer rivedi components/ProductViewer.tsx`
- Per test: `@fiera-tester genera test hotspots.spec.ts`
- Per asset 3D: `/tripo-pipeline`
- Per consultare ECC: `leggi @vault/Everything Claude Code/04 - Skills/threejs-skills/SKILL.md`

### Chiusura sessione

```
/checkpoint
```

Questo salva stato in `_opencode-memory/current-state.md` per la prossima sessione.

### Quando passi a Claude Code

```
/handoff-claude
```

Genera `HANDOFF.md`, poi apri Claude Code in stessa cartella e dì:
> "Leggi @HANDOFF.md e procedi col task 1."

---

## Troubleshooting

| Problema | Soluzione |
|---|---|
| OpenCode non trova il vault | Verifica path in `.opencode/opencode.json` (Windows: usa `/` non `\`). Test: `bunx @modelcontextprotocol/server-filesystem "C:/Users/loren/Desktop/obsidian vault"` deve avviare senza errori |
| Subagent non viene invocato | Controlla syntax YAML frontmatter (description obbligatoria). Riavvia OpenCode |
| `/checkpoint` non scrive nel vault | Verifica MCP filesystem-vault `enabled: true` e path scrivibile |
| Memoria non persiste tra sessioni | OpenCode non ha auto-memory come Claude Code. Devi sempre fare `/checkpoint` a fine sessione e leggere `current-state.md` all'inizio |
| Conflict con Claude Code (stesso file) | Usa worktree git: `git worktree add ../AURELIA-opencode opencode-branch`. OpenCode lavora su `opencode-branch`, Claude su `master`. Merge dopo |
| MCP context7 non risponde | Verifica connessione internet, `enabled: true`, riavvia opencode. È remote, non offline |
| Token usage alto | In `opencode.json` set `small_model: "anthropic/claude-haiku-4-5"` e usa Haiku per esplorazione (`opencode --model haiku` per singolo turn) |

---

## Riferimenti

- OpenCode docs: https://opencode.ai/docs/
- AGENTS.md spec: https://agents.md
- MCP servers list: https://github.com/modelcontextprotocol/servers
- Vault ECC source: `Everything Claude Code/_source/`
- Brief originale progetto: `docs/00-brief.md`

---

*Generato {ISO_DATE}. Versione 1.0 — setup OpenCode con persistent memory + Obsidian.*
