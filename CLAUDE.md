@AGENTS.md

## Design System

Always read `DESIGN.md` before making any visual or UI decision. All font
choices, colors, spacing, radii, motion, and the aesthetic direction are
defined there (deep spec: `docs/02-ui-design-system.md`; brand lock:
`docs/00-brief.md`). The brief is **locked** — do not deviate without
explicit approval from Lorenzo. In QA / review, flag any code that
violates DESIGN.md or the anti-template guardrails (G1–G10), especially:
copper never as text color, max one copper-active element per screen,
no border-radius >8px on panels, no default Tailwind palette colors,
no Material drop-shadows, reduced-motion fallbacks intact.

