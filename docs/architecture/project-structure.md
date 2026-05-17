# Project Structure

Kreis queda organizado como un monolito modular con apps separadas y paquetes compartidos. La raiz del repo se reserva para orquestacion: scripts, TypeScript references, lockfile, Vercel y documentacion general.

```text
apps/
  web/                  PWA React/Vite
  api/                  API Express/Node.js
packages/
  shared/               Contratos TypeScript compartidos entre apps
infra/
  database/             Migraciones, seeds, fixtures y schema
docs/
  architecture/         Decisiones tecnicas
  design/               Direccion visual del producto
  product/              Contexto funcional
  brand-assets/         Originales de marca que no se importan en runtime
codex-skills/           Skills locales para Codex y agentes del proyecto
```

## Apps

`apps/web` contiene la experiencia instalable: `src`, `public`, manifest, iconos, assets runtime, estilos y configuracion de Vite/PWA.

`apps/api` contiene el backend Express como monolito modular. Cada modulo vive en `apps/api/src/modules/<modulo>` y separa `api`, `application`, `domain`, `infrastructure` y `tests`.

## Shared

`packages/shared` es para contratos sin dependencia de React ni Express: tipos de API, DTOs, enums compartidos y validaciones que necesiten ambos lados.

## Infra

`infra/database` es el punto de entrada para el equipo de datos: migraciones, seeds, fixtures y schema. Cuando se elija ORM o migrator, sus archivos deberian colgar de esta carpeta o documentar claramente por que no.

## Regla Practica

Si un archivo pertenece a una app concreta, va dentro de `apps/<app>`. Si lo consumen web y API, va en `packages/shared`. Si describe infraestructura o datos, va en `infra`. Si explica decisiones, va en `docs`.
