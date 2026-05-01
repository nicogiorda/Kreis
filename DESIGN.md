# Kreis Design Context

## Colors

- Brand orange: `#f0531c`.
- Cream app background: `#fffaf3`.
- Warm surface: `#fffdf8`.
- Deep green: `#09332c`.
- Soft beige: `#fbf1df`.

Use the orange as a committed brand field for launch moments. Product surfaces should remain warm, light, and clear.

## Typography

The app currently uses `Satoshi` with `Arial` fallback. Keep UI labels compact and direct. Avoid oversized text inside utility controls.

## Assets

Runtime brand assets live in `src/assets/brand/` and should be limited to files imported by the app. Original brand exports live in `docs/brand-assets/`.

The inverted SVG source files are light marks intended for dark or saturated backgrounds:

- `ISOTIPO_INVERTIDO SVG.svg`
- `KREIS_INVERTIDO SVG.svg`
- `KREIS_INVERTIDO (SOLO TEXTO) SVG.svg`

## Motion

Splash motion should be one short brand moment:

- Start on orange.
- Reveal the isotipo first.
- Settle into the full Kreis lockup.
- Fade the launch layer away into the app.
- Prefer transform, opacity, and clip-path.
- Keep the splash background as a flat `#f0531c`, with no shadows or tonal variation.
- Respect `prefers-reduced-motion`.
