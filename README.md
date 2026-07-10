# Kreis

Kreis es una PWA pensada para la vida universitaria: eventos, comunidades, publicaciones y herramientas de perfil en una experiencia mobile-first.

El proyecto combina un frontend React/Vite instalable como app y una API Node.js/Express organizada como monolito modular.

## Stack

- React 19 + TypeScript
- Vite + vite-plugin-pwa
- Tailwind CSS 4 + CSS modular por superficie
- Node.js + Express
- Prisma + PostgreSQL
- Supabase Auth y Storage
- Vitest + Testing Library
- ESLint + Prettier

## Estructura

```text
apps/
  web/                  PWA React/Vite
  api/                  API Express
packages/
  shared/               Contratos compartidos
infra/
  database/             Migraciones, schema y fixtures
```

## Requisitos

- Node.js compatible con las dependencias del proyecto
- npm
- PostgreSQL/Supabase configurado
- Variables de entorno locales basadas en `.env.example`

## Configuración Local

1. Instalar dependencias:

```bash
npm install
```

2. Crear el archivo `.env` desde `.env.example` y completar los valores locales.

3. Generar Prisma Client:

```bash
npm run db:generate
```

4. Levantar frontend:

```bash
npm run dev
```

5. Levantar API:

```bash
npm run dev:api
```

Por defecto, el frontend corre con Vite y la API usa `API_PORT` desde `.env`.

## Comandos

```bash
npm run dev
npm run dev:api
npm run build
npm run lint
npm run test
npm run typecheck
npm run typecheck:web
npm run typecheck:api
npm run format:check
```

Para probar la PWA desde un celular en la misma red:

```bash
npm run dev -- --host 0.0.0.0
```

## Variables de Entorno

El repositorio incluye `.env.example` con placeholders. No se deben commitear archivos `.env` reales.

Variables principales:

- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `REDIS_URL`
- `RATE_LIMIT_KEY_SECRET`
- `RESEND_API_KEY`
- `REGISTRATION_EMAIL_FROM`
- `ALLOWED_EMAIL_DOMAINS`

## Seguridad

Este repositorio no debe contener secretos, tokens de sesión, certificados privados ni dumps de base de datos. Las credenciales se manejan por variables de entorno locales o por el proveedor de deploy.

Para reportar vulnerabilidades, seguí las indicaciones de `SECURITY.md`.

## Licencia

Código propietario. Todos los derechos reservados. Ver `LICENSE`.

## Deploy

El frontend PWA está preparado para Vercel. La API puede ejecutarse como servicio Node.js usando las variables de entorno correspondientes.
