# Kreis

PWA React + Vite + TypeScript con API Express en Node.js para prototipar la experiencia de Kreis.

## Estructura

```text
apps/
  web/                  PWA React/Vite: src, public, manifest, icons
  api/                  API Express como monolito modular Node.js
packages/
  shared/               Contratos TypeScript compartidos
infra/
  database/             Migraciones, schema, seeds y fixtures
docs/
  architecture/         Decisiones tecnicas y limites de modulos
  design/               Direccion visual del producto
  product/              Contexto de producto
  brand-assets/         Originales y exports de marca que no se importan en runtime
codex-skills/           Skills locales del proyecto
```

## Web PWA

La app instalable vive en `apps/web`. Ahi estan `index.html`, `public/manifest.json`, iconos PWA, assets runtime y todo el frontend. El service worker se genera con `vite-plugin-pwa` desde `apps/web/vite.config.ts`.

## API

La API vive en `apps/api`. La direccion recomendada es Node.js + TypeScript + Express. Next.js solo conviene si se migra tambien el frontend desde Vite a Next; no hace falta instalarlo para tener un backend modular.

## Comandos

```bash
npm.cmd run dev
npm.cmd run dev:api
npm.cmd run lint
npm.cmd run format:check
npm.cmd run test
npm.cmd run typecheck
npm.cmd run typecheck:api
npm.cmd run build
npm.cmd run preview
```

Para probar desde el celular en la misma red Wi-Fi:

```bash
npm.cmd run dev -- --host 0.0.0.0
```

La guia de ownership de carpetas esta en `docs/architecture/project-structure.md`.
