# Design

## Visual Theme

Kreis is a warm mobile product interface with a confident campus identity. The UI should feel approachable, social, and light enough for repeated use. The home experience uses a large illustrated UADE banner, cream or dark warm backgrounds, rounded compact controls, soft event rows, and a solid bottom navigation bar.

## Color System

The current implementation defines design tokens in `apps/web/src/styles/global.css`.

Primary light-mode tokens:

- Brand orange: `#f0531c`, used for active states, primary emphasis, and launch identity.
- Cream app background: `#f7edda`, used for home and bottom navigation surfaces.
- Deep green: `#09332c`, used as a brand anchor and dark visual contrast.
- Norfolk green: `#2e4b3c`, used for accents and muted navigation states.
- Pumpkin accent: `#ffa74f`, used for warm badges and secondary emphasis.
- Ink: `#0a0a0a`, used for primary text in light mode.

Primary dark-mode tokens:

- Dark app background: `#2b2928`.
- Dark surface: `#332f2d`.
- Cream ink: `#f7edda`.
- Brand orange remains `#f0531c`.

Use orange deliberately. It can dominate splash and active states, but normal product surfaces should stay calm, readable, and warm.

## Typography

The app uses `Satoshi` as the main UI face with `Arial` fallback. Brand font files for Amsi Pro and Gazpacho are available in runtime assets, but compact product UI should keep labels and controls readable rather than decorative.

Guidelines:

- Keep utility labels short and direct.
- Avoid oversized type inside cards, tab switches, toolbars, and bottom navigation.
- Use weight and spacing for hierarchy before introducing extra font sizes.
- Preserve comfortable line-height on mobile.

## Layout

The product is mobile-first. The home screen should fit a narrow app viewport before desktop enhancements.

Current home layout intent:

- Banner is full-bleed horizontally and square on mobile.
- Content begins immediately after the banner.
- Switch and cards sit close to the viewport edges without touching them.
- Bottom navigation is solid, fixed to the bottom, and uses centered Solar Icons.
- Avoid page-level decorative cards and nested card structures.

Spacing should vary by function: compact controls can be tight, event rows need breathing room, and large brand imagery should not be boxed in.

## Components

Important product components:

- `HeroBanner`: full-width UADE visual, theme toggle, no glass treatment.
- `HomeScreen`: event and community tab switch, content rails, compact lists.
- `EventCard`: soft rounded event row with date chip, title, location, optional official badge, and trailing action.
- `BottomNav`: solid bottom bar, Solar Icons, active orange state, muted inactive state.
- `Header`: used outside home for global search and utility actions.

Use cards only when the object needs a clear tap target or scannable repeated item. Do not wrap whole page sections in decorative cards.

## Motion

Motion should be brief and product-serving.

- Prefer transform, opacity, and clip-path.
- Avoid animating layout properties.
- Use ease-out timing with natural settling.
- Respect `prefers-reduced-motion`.
- Splash should be a short brand moment, then disappear without delaying use.

## Assets

Runtime brand assets live in `apps/web/src/assets/brand/`. Source brand exports live in `docs/brand-assets/`.

The home banner uses separate light and dark WebP images. Keep those images as first-screen signals and avoid dark overlays, blur crops, or stock-like atmospheric substitutions.

## Implementation Notes

Use Tailwind utilities when they match the local pattern and CSS custom properties for shared tokens. Preserve the modular project structure under `apps/web`, `apps/api`, `packages/shared`, and `infra`. When changing frontend layout, verify mobile widths around `393px` and wider mobile widths around `430px`.
