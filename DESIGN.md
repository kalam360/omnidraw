# Omnidraw Design System

> Adapted from [`linear-app/DESIGN.md`](https://github.com/nexu-io/open-design/tree/main/design-systems/linear-app) (Apache-2.0). Structural language preserved; brand and accent rebranded for a teaching/canvas tool.

## 1. Visual Theme

**Dark-mode-native cockpit.** Near-black canvas where content emerges from darkness. Extreme precision — every element exists in a calibrated luminance hierarchy. Information density via subtle gradations of white opacity, not color variation.

This is a **tool to think with on stage**. It should disappear when you're teaching and snap to attention when you need it. No flourishes; everything earns its pixels.

**Key characteristics**
- Dark-mode-native: `#08090a` (page) → `#0f1011` (panel) → `#191a1b` (elevated) → `#28282c` (hover)
- Inter Variable globally, with OpenType `cv01` + `ss03` features (geometric alternates)
- Signature weight **510** for UI (between regular and medium)
- Aggressive negative letter-spacing at display sizes
- Brand accent **cyan** `#22d3ee` / `#06b6d4` (chalk-on-blackboard) — the only chromatic color
- Semi-transparent white borders: `rgba(255,255,255,0.05)` to `rgba(255,255,255,0.08)`
- Button backgrounds at near-zero opacity: `rgba(255,255,255,0.02)` to `rgba(255,255,255,0.05)`
- Berkeley Mono / ui-monospace for code & technical labels

## 2. Color Palette

### Backgrounds
| Token | Value | Use |
|---|---|---|
| `--bg-page` | `#08090a` | Outermost background |
| `--bg-panel` | `#0f1011` | Sidebar, side panels |
| `--bg-surface` | `#191a1b` | Cards, dropdowns, modal bodies |
| `--bg-surface-hover` | `#28282c` | Hover, slightly elevated |
| `--bg-input` | `rgba(255,255,255,0.02)` | Inputs, ghost button bg |
| `--bg-input-hover` | `rgba(255,255,255,0.05)` | Input/button hover |

### Text
| Token | Value | Use |
|---|---|---|
| `--text-primary` | `#f7f8f8` | Headings |
| `--text-body` | `#d0d6e0` | Body text |
| `--text-muted` | `#8a8f98` | Secondary, labels, placeholders |
| `--text-subtle` | `#62666d` | Disabled, hints, timestamps |

### Borders
| Token | Value | Use |
|---|---|---|
| `--border-subtle` | `rgba(255,255,255,0.05)` | Card outlines, dividers |
| `--border-default` | `rgba(255,255,255,0.08)` | Inputs, panels |
| `--border-strong` | `rgba(255,255,255,0.12)` | Focus rings, emphasis |

### Accent (omnidraw cyan — chalk on blackboard)
| Token | Value | Use |
|---|---|---|
| `--accent` | `#06b6d4` | CTA backgrounds, brand surfaces |
| `--accent-hover` | `#22d3ee` | Hover state |
| `--accent-bright` | `#67e8f9` | Active strokes, focus, links |
| `--accent-on-dark` | `#cffafe` | Text on dark accent surfaces |

### Status
| Token | Value | Use |
|---|---|---|
| `--success` | `#10b981` | Success states |
| `--warning` | `#f59e0b` | Warnings |
| `--danger` | `#ef4444` | Errors, destructive |

## 3. Typography

```
Inter Variable (Google Fonts), font-feature-settings: "cv01", "ss03"
Fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
Mono: "Berkeley Mono", ui-monospace, "SF Mono", Menlo, monospace
```

### Weights
- **400** — body text
- **510** — UI labels, navigation, buttons (Linear's signature weight)
- **590** — emphasis, headings

### Type scale
| Token | Size | Letter-spacing | Use |
|---|---|---|---|
| `--text-xs` | 11px / 1.4 | 0 | Hints, timestamps |
| `--text-sm` | 13px / 1.5 | 0 | Body small, labels |
| `--text-base` | 15px / 1.6 | 0 | Body |
| `--text-lg` | 17px / 1.5 | -0.2px | Large body, subheads |
| `--text-xl` | 22px / 1.4 | -0.4px | Section titles |
| `--text-2xl` | 32px / 1.25 | -0.704px | Page titles |
| `--text-3xl` | 48px / 1.15 | -1.056px | Display |
| `--text-4xl` | 72px / 1.05 | -1.584px | Hero |

## 4. Spacing

Base unit **8px**. Scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

## 5. Border Radius

| Token | Value | Use |
|---|---|---|
| `--radius-1` | 2px | Inline badges, micro chips |
| `--radius-2` | 4px | Small containers |
| `--radius-3` | 6px | Buttons, inputs |
| `--radius-4` | 8px | Cards, dropdowns |
| `--radius-5` | 12px | Panels, modals |
| `--radius-pill` | 9999px | Chips, status pills |

## 6. Shadows / Elevation

On dark surfaces, elevation comes from background-luminance steps and inset shadows, not drop shadows.

| Token | Value | Use |
|---|---|---|
| `--shadow-inset` | `inset 0 0 12px rgba(0,0,0,0.2)` | Recessed panels |
| `--shadow-soft` | `0 2px 4px rgba(0,0,0,0.4)` | Floating cards |
| `--shadow-modal` | `0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)` | Modals, popovers |
| `--shadow-focus` | `0 0 0 2px rgba(34,211,238,0.4)` | Focus ring (cyan) |

## 7. Component primitives (for Segment 1 preview)

- **Button** — Primary (accent fill), Secondary (ghost), Tertiary (text), Icon-only. Sizes: sm/md/lg.
- **Input** — Text, Textarea, Search-with-icon, with-error.
- **Card** — Basic, with header, with footer.
- **Badge** — Status (success/warning/danger/info), Tag (neutral).
- **ChatMessage** — User, Agent (assistant), Tool-call, System.
- **Sidebar nav item** — Default, Active, with badge.
- **Modal** — Header, body, footer.
- **CodeBlock** — Mono, language label, copy button.
- **StatusDot** — Connected, Connecting, Disconnected.

## 8. Iteration rules

1. Always set `font-feature-settings: "cv01", "ss03"` on Inter text.
2. Letter-spacing scales with size — see Type scale table.
3. Three weights: 400, 510, 590. Don't introduce a fourth without a reason.
4. Surface elevation via background opacity, not shadow darkness. `0.02 → 0.04 → 0.05`.
5. Cyan accent is the **only** chromatic UI color. Status colors only on status indicators (dots, toasts).
6. Borders are always semi-transparent white, never solid dark on dark.
7. Berkeley Mono / ui-monospace for any code or technical content. Inter for everything else.

## 9. Dark / Light parity

V1 ships dark only. Light theme is a v2 concern; tokens are structured so a `[data-theme="light"]` block can override without touching component CSS.
