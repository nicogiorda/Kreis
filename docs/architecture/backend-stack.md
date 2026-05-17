# Backend stack

## Recomendacion actual

Usar Node.js + TypeScript + Express para el backend de Kreis, manteniendo el frontend PWA en Vite.

No instalar Next.js todavia. Next.js es excelente si la app completa va a vivir en Next, pero para un backend modular separado no es la opcion mas limpia: mezcla una segunda capa de frontend/routing con una app que ya funciona en Vite.

## Estructura correcta para este camino

```text
apps/api/
  src/
    platform/       HTTP server, middlewares, route registry
    core/           config, errors, auth primitives, logging
    shared/         helpers tecnicos internos
    modules/
      events/
      communities/
      posts/
      users/
      auth/
      discovery/
      notifications/
```

Esta estructura esta bien para monolito modular. La capa `platform` expone HTTP; los modulos contienen reglas y casos de uso.

## Framework HTTP

Decision actual: Express.

Motivos:

- Es el framework Node mas familiar para levantar un backend rapido.
- Encaja bien con una API separada del frontend Vite ubicado en `apps/web`.
- No impone arquitectura; la arquitectura la define nuestro monolito modular.
- Tiene ecosistema amplio para auth, middlewares, testing y documentacion.

Alternativas que quedan como plan B:

- Fastify si mas adelante necesitamos performance o schemas integrados.
- Hono si queremos algo minimalista y orientado a runtimes edge/serverless.
- Nest si el equipo quiere convenciones fuertes y decoradores.

## Cuando si usar Next.js

Usar Next.js si decidimos migrar el frontend:

```text
app/
  api/              Route handlers HTTP
src/
  server/modules/   Modulos de negocio
  components/       UI
```

Eso seria una migracion de Vite a Next, con cambios en scripts, routing, build, assets y deployment. No es solo instalar `next`.

## Instalacion realizada

Dependencias runtime:

```bash
npm.cmd install express cors helmet zod
```

Dependencias de desarrollo:

```bash
npm.cmd install -D @types/express @types/cors tsx
```

Scripts:

```json
{
  "dev:api": "tsx watch apps/api/src/platform/server.ts",
  "typecheck:api": "tsc -p apps/api/tsconfig.json"
}
```
