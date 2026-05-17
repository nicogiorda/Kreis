# PWA

Esta carpeta reserva el espacio para logica propia de PWA: prompts de instalacion, estado offline, actualizaciones del service worker y futuras notificaciones push.

Por ahora la configuracion operativa vive en `apps/web/vite.config.ts` con `vite-plugin-pwa`, usando el manifest publico de `apps/web/public/manifest.json`.

## Responsabilidades

- `apps/web/public/manifest.json`: metadata instalable, colores, iconos y alcance de la app.
- `apps/web/vite.config.ts`: generacion del service worker, precache y estrategias de cache.
- `apps/web/src/pwa/`: UI y hooks relacionados con instalacion, offline/update prompts y push cuando se implementen.
