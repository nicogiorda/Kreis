# API

Base para el API de Kreis. La idea es un monolito modular: una aplicacion Express en Node.js, separada internamente por dominios de producto.

Por ahora este directorio deja una base Express minima y los limites de ownership para que backend pueda empezar sin mezclar responsabilidades.

## Estructura

```text
apps/api/
  src/
    core/        Configuracion, errores, logging, auth primitives
    platform/    HTTP server, middlewares, routing, jobs
    shared/      Utilidades internas del backend sin reglas de negocio
    modules/     Dominios de Kreis
```

## Reglas de trabajo

- Un modulo no importa `infrastructure` de otro modulo.
- Las lecturas que combinan varios dominios viven en `discovery` o en un caso de uso explicito.
- Los cambios de schema se coordinan con `infra/database/migrations`.
- Los tipos compartidos con el frontend viven en `packages/shared/contracts`.

## Stack recomendado

Para la estructura actual, la recomendacion es:

- Runtime: Node.js.
- Lenguaje: TypeScript.
- App backend: API Node.js dentro de `apps/api/`.
- Framework HTTP: Express.
- Validacion: Zod.
- Seguridad base: Helmet.
- CORS: paquete `cors`.

Next.js no conviene instalarlo solo "para backend" mientras el frontend siga en Vite. Next es un framework full-stack de React: tiene sentido si migramos tambien el frontend a Next y usamos `app/api` como capa HTTP.

## Comandos

```bash
npm.cmd run dev:api
npm.cmd run typecheck:api
```

El servidor arranca por defecto en `http://localhost:4000`.

Endpoints iniciales:

```text
GET /health
GET /api/v1/auth
GET /api/v1/users
GET /api/v1/events
GET /api/v1/communities
GET /api/v1/posts
GET /api/v1/discovery
GET /api/v1/notifications
```

## Stack pendiente

Decidir antes de implementar:

- ORM/query builder: Prisma, Drizzle, Kysely, SQL directo u otro.
- Motor de base de datos: recomendado evaluar Postgres para relaciones y busqueda.
- Estrategia de auth: sesiones, JWT, proveedor externo o auth propia.
