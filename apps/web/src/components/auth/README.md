# Auth and Splash Layout

This module is intentionally separate from the authenticated app layout.

Rules:

- `AuthViewport`, `AuthShell`, `AuthScreenFrame`, and `AuthStage` must all cover the same visible viewport.
- Do not model screen height as `100dvh + env(safe-area-inset-bottom)`.
- Do not position roots with `bottom: -env(safe-area-inset-bottom)`.
- Safe-area insets may protect foreground controls, but they must not change the size of the decorative background.
- Mascot and color fields belong in `AuthDecorLayer`, which is full-bleed and independent from interactive content.
- Avoid global `html::after` or `body::after` patches for auth/splash gaps.
- Keep auth/splash styles in `apps/web/src/styles/auth-flow.css`.

Verification:

Run the app locally and then:

```bash
npm run verify:auth-layout
```

The check expects `#root`, `.auth-stack-root`, `.auth-redesign-shell`, `.auth-redesign-screen`, and `.auth-redesign-stage` to match `window.innerHeight`.
