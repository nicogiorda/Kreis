# Auth and Splash Layout

This module is intentionally separate from the authenticated app layout.

Rules:

- `AuthViewport`, `AuthShell`, `AuthScreenFrame`, and `AuthStage` must all cover the same visible viewport.
- Do not model screen height as `100dvh + env(safe-area-inset-bottom)`.
- Auth/splash may extend the visual root with `--auth-visual-bottom-extension`; the interactive stage must keep the logical viewport height.
- Safe-area insets may protect foreground controls, but they must not change the logical size of `AuthDecorLayer`.
- Mascot and color fields belong in `AuthDecorLayer`; the image can extend visually into the bottom safe area while the layer keeps viewport height.
- Avoid global `html::after` or `body::after` patches for auth/splash gaps.
- Keep auth/splash styles in `apps/web/src/styles/auth-flow.css`.

Verification:

Run the app locally and then:

```bash
npm run verify:auth-layout
```

The check expects the normal layout to match `window.innerHeight`, then simulates a 34px bottom inset: the visual root and character image extend, while `.auth-redesign-stage`, `.auth-redesign-decor-layer`, and foreground controls keep their original positions.
