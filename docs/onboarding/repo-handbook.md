# Kreis Repo Handbook

Guia rapida para cualquier persona que vaya a modificar este repo sin romper la arquitectura.

Ultima revision: 2026-05-17.

## 1. Que es este repo

Kreis es una PWA React/Vite con una API Express/Node.js dentro del mismo repositorio. La arquitectura elegida es monolito modular: un solo repo, una API separada internamente por dominios, contratos compartidos y un espacio claro para database/infra.

La regla principal es simple: cada archivo tiene un lugar. Si no estas seguro donde va algo, no lo dejes en la raiz.

## 2. Mapa del proyecto

```text
apps/
  web/                  Frontend PWA React/Vite
  api/                  Backend Express/Node.js
packages/
  shared/               Contratos TypeScript compartidos
infra/
  database/             Schema, migraciones, seeds y fixtures
docs/
  architecture/         Decisiones tecnicas y ownership
  design/               Direccion visual
  product/              Contexto funcional
  onboarding/           Esta guia y material para colaboradores
codex-skills/           Skills locales para agentes/Codex
```

## 3. Reglas de oro

1. No agregues archivos sueltos en la raiz salvo configs del repo.
2. Si pertenece al frontend, va en `apps/web`.
3. Si pertenece al backend, va en `apps/api`.
4. Si lo usan frontend y backend, va en `packages/shared`.
5. Si es schema, migracion, seed o fixture, va en `infra/database`.
6. Si cambia una decision tecnica, documentala en `docs/architecture`.
7. No instales dependencias "por las dudas". Cada dependencia nueva debe tener razon clara.
8. Antes de pedir review, corre `lint`, `typecheck`, `test` y `build`.

## 4. Comandos obligatorios

```bash
npm.cmd run dev
npm.cmd run dev:api
npm.cmd run lint
npm.cmd run test
npm.cmd run typecheck
npm.cmd run typecheck:api
npm.cmd run build
```

Comandos de formato:

```bash
npm.cmd run format:check
npm.cmd run format
```

Nota: `format` puede tocar muchos archivos. Si solo estas haciendo un cambio chico, consulta antes de meter un diff enorme solo de estilo.

## 5. Flujo recomendado antes de modificar

1. Lee `README.md`.
2. Lee `docs/architecture/project-structure.md`.
3. Si vas a tocar backend, lee `docs/architecture/monolito-modular.md` y `docs/architecture/backend-stack.md`.
4. Si vas a tocar estilos o experiencia visual, lee `docs/design/DESIGN.md`.
5. Ubica el owner de la carpeta antes de crear archivos.
6. Hace cambios chicos y verificables.
7. Corre los comandos de chequeo.
8. Actualiza docs si cambias estructura, scripts, endpoints, contratos o decisiones tecnicas.

## 6. Frontend PWA

El frontend vive en `apps/web`.

```text
apps/web/
  index.html
  public/
    manifest.json
    icons/
  src/
    app/
    components/
    data/
    pwa/
    styles/
    test/
    utils/
```

Buenas practicas:

- Componentes React en `apps/web/src/components`.
- Pantallas o composiciones grandes por dominio visual: `home`, `events`, `communities`, `profile`.
- Estilos globales en `apps/web/src/styles/global.css`.
- Utilidades puras en `apps/web/src/utils`.
- Config PWA en `apps/web/vite.config.ts`.
- Manifest e iconos instalables en `apps/web/public`.
- Hooks o UI de instalacion/offline/update prompt en `apps/web/src/pwa`.

No hacer:

- No meter logica backend dentro del frontend.
- No crear assets runtime fuera de `apps/web/src/assets` o `apps/web/public`.
- No tocar el service worker generado en `dist`; se genera desde Vite.
- No usar datos mock como si fueran contratos reales de API.

Cuando se agregue routing real, usar `react-router`. No reinventar navegacion con strings si ya existe una ruta.

## 7. Backend API

El backend vive en `apps/api`.

```text
apps/api/src/
  platform/       HTTP server, middlewares, route registry
  core/           config, errores, primitives compartidas
  shared/         helpers internos del backend
  modules/
    auth/
    users/
    events/
    communities/
    posts/
    discovery/
    notifications/
```

Cada modulo debe seguir esta estructura:

```text
module-name/
  api/             Rutas, controladores, DTOs HTTP
  application/     Casos de uso y orquestacion
  domain/          Entidades, reglas y value objects
  infrastructure/  Repositorios, queries, adaptadores externos
  tests/           Tests del modulo
  README.md        Ownership y limites del modulo
```

Reglas de backend:

- `api` valida request/response y delega.
- `application` coordina casos de uso.
- `domain` no depende de Express ni de la base de datos.
- `infrastructure` toca persistencia o servicios externos.
- Un modulo no importa `infrastructure` de otro modulo.
- Validar entradas con `zod` cuando haya endpoints reales.
- Mantener errores HTTP en una capa comun, no duplicarlos en cada ruta.
- No mezclar decisiones de DB en controladores.

## 8. Contratos compartidos

Los contratos viven en `packages/shared`.

Usar esta carpeta para:

- Tipos de request/response compartidos.
- DTOs comunes.
- Enums compartidos.
- Schemas `zod` que deban ser consumidos por frontend y backend.

No usar esta carpeta para:

- Componentes React.
- Codigo Express.
- Queries de base de datos.
- Logica de UI.

## 9. Database e infra

La base de trabajo de datos vive en `infra/database`.

```text
infra/database/
  schema/       Modelo conceptual, ERD, decisiones de tablas
  migrations/   Cambios versionados de schema
  seeds/        Datos iniciales para desarrollo
  fixtures/     Datos chicos para tests o demos
```

Reglas:

- Toda modificacion estructural debe tener migracion.
- Los seeds no reemplazan migraciones.
- Los fixtures son chicos y pensados para tests/demos.
- Si una tabla pertenece a un modulo backend, coordinar el cambio con ese modulo.
- Documentar motor/ORM elegido antes de crear migraciones reales.

## 10. Dependencias

Antes de instalar una dependencia:

1. Verifica si ya existe algo en el repo que resuelve el problema.
2. Prefiere librerias conocidas y mantenidas.
3. Instala con version exacta cuando sea importante para seguridad/reproducibilidad.
4. Revisa `package-lock.json`.
5. Corre `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test` y `npm.cmd run build`.

Dependencias clave actuales:

- `react-router`: routing frontend.
- `zod`: validacion y contratos.
- `express`: API HTTP.
- `helmet`: headers de seguridad.
- `cors`: politica de origenes.
- `eslint`: calidad de codigo.
- `prettier`: formato.
- `vitest` + Testing Library: tests.
- `vite-plugin-pwa`: service worker y PWA build.

## 11. Checklist antes de PR

- [ ] El cambio esta en la carpeta correcta.
- [ ] No agregue archivos sueltos en raiz.
- [ ] No rompi boundaries entre frontend/backend/shared/infra.
- [ ] Actualice docs si cambie estructura, comandos, contratos o endpoints.
- [ ] No instale dependencias innecesarias.
- [ ] Corri `npm.cmd run lint`.
- [ ] Corri `npm.cmd run test`.
- [ ] Corri `npm.cmd run typecheck`.
- [ ] Corri `npm.cmd run build`.
- [ ] Si toque backend, corri `npm.cmd run typecheck:api`.

## 12. Senales de alerta

Frena y consulta si:

- Estas por cambiar carpetas de alto nivel.
- Necesitas mover contratos entre frontend y backend.
- Queres instalar una dependencia grande.
- Vas a cambiar `vite.config.ts`, `tsconfig`, `package.json`, `vercel.json` o configs de lint/test.
- Vas a tocar migraciones o schema sin decision de DB documentada.
- Estas copiando logica entre modulos en vez de ubicar un owner.

## 13. Documentos relacionados

- `README.md`
- `docs/architecture/project-structure.md`
- `docs/architecture/monolito-modular.md`
- `docs/architecture/backend-stack.md`
- `docs/design/DESIGN.md`
- `infra/database/README.md`
- `apps/api/src/modules/MODULE_TEMPLATE.md`
