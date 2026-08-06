# SIRA Design System

## Design direction

SIRA es una herramienta técnica de uso diurno. La escena de referencia es una persona revisando mediciones en una laptop dentro de un laboratorio o una oficina de campo con luz ambiental variable. La interfaz usa un tema claro de alto contraste, una base mineral fría y un verde agronómico reservado para navegación, selección y acciones primarias.

## Product dials

- Design variance: 4/10
- Motion intensity: 3/10
- Visual density: 6/10

## Color

| Role | Token | Value |
|---|---|---|
| Page | `--canvas` | `#f3f6f4` |
| Surface | `--surface` | `#ffffff` |
| Subtle surface | `--surface-muted` | `#eaf0ec` |
| Ink | `--ink` | `#132018` |
| Muted ink | `--ink-muted` | `#536259` |
| Border | `--line` | `#d9e2dc` |
| Primary | `--brand` | `#17643a` |
| Primary hover | `--brand-strong` | `#10502e` |
| Primary soft | `--brand-soft` | `#dceee3` |
| Warning | `--warning` | `#9a5b08` |
| Danger | `--danger` | `#b42318` |
| Information | `--info` | `#23648f` |

The accent is functional. Green marks primary actions, current navigation and agronomic selection. Amber, red and blue are semantic state colors only.

## Typography

- Family: `"Segoe UI Variable", "Aptos", "Segoe UI", system-ui, sans-serif`
- Numbers: tabular figures through `font-variant-numeric: tabular-nums`
- Page title: 32 px desktop, 28 px compact, 700 weight
- Section title: 18-20 px, 700 weight
- Body: 14-16 px, 1.55 line height
- Metadata: 12-13 px, 500 weight
- Avoid uppercase paragraphs and decorative tracking.

## Shape and elevation

- Inputs: 8 px radius
- Buttons and navigation items: 8 px radius
- Panels and cards: 12 px radius
- Badges: 6 px radius
- Use borders for grouping. Use a small tinted shadow only for floating layers and the map.
- No nested card styling. Inner groups use dividers or muted surfaces.

## Layout

- Maximum application width: 1600 px
- Page gutters: 20 px mobile, 32 px desktop
- Header: 64-72 px desktop, structurally responsive on mobile
- Desktop dashboard: summary first, then operational detail, then technical evidence
- Mobile: single column, horizontal overflow only for real tables

## Components

- Primary button: solid brand background, white label, visible focus ring
- Secondary button: white surface, line border, dark label
- Danger action: quiet by default, explicit confirmation panel before execution
- Form field: label above, optional helper, error below
- Metric: label, tabular value, unit and optional threshold; state uses a semantic marker and text
- Status: icon, label, reason and timestamp when available
- Loading: skeleton that matches the final shape
- Empty: next action plus a short explanation
- Error: contextual message, likely cause and retry or navigation action

## Motion

Use 150-220 ms transitions for hover, focus, disclosure and pressed feedback. Animate only transform and opacity. Disable nonessential movement under `prefers-reduced-motion`.
