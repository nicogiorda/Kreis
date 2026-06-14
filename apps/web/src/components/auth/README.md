# Auth and Splash Layout

This module is intentionally separate from the authenticated app layout.

Rules:

- `AuthViewport`, `AuthShell`, and `AuthScreenFrame` own the full-bleed visual viewport.
- `AuthStage` owns the logical interactive viewport.
- Do not model screen height as `100dvh + env(safe-area-inset-bottom)`.
- Auth/splash use `--auth-visual-height` for the full-bleed canvas and `--auth-layout-height` for foreground positioning.
- `--auth-visual-bottom-extension` is diagnostic only and must not change layout.
- Safe-area insets may protect foreground controls, but they must not change the logical size of `AuthDecorLayer`.
- Mascot and color fields belong in `AuthDecorLayer`; the image should cover the visual viewport without adding safe-area height.
- Avoid global `html::after` or `body::after` patches for auth/splash gaps.
- Keep auth/splash styles in `apps/web/src/styles/auth-flow.css`.

Verification:

Run the app locally and then:

```bash
npm run verify:auth-layout
```

The check measures `vh`, `dvh`, `lvh`, and `svh`: the visual root/shell/screen/character/splash should match `--auth-visual-height`, while stage/decor/splash frame should match `--auth-layout-height`.
