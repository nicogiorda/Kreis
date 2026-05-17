# Backend

Base para el API de Kreis. La idea es un monolito modular: una aplicacion backend, separada internamente por dominios de producto.

Por ahora este directorio solo define limites y ownership. No instala framework ni dependencias nuevas para no condicionar al equipo backend antes de elegir stack.

## Estructura

```text
backend/
  src/
    core/        Configuracion, errores, logging, auth primitives
    platform/    HTTP server, middlewares, routing, jobs
    shared/      Utilidades internas del backend sin reglas de negocio
    modules/     Dominios de Kreis
```

## Regla de trabajo

- Un modulo no importa `infrastructure` de otro modulo.
- Las lecturas que combinan varios dominios viven en `discovery` o en un caso de uso explicito.
- Los cambios de schema se coordinan con `database/migrations`.
- Los tipos compartidos con el frontend viven en `shared/contracts`.

## Stack pendiente

Decidir antes de implementar:

- Framework HTTP: Express, Fastify, Hono, Nest u otro.
- ORM/query builder: Prisma, Drizzle, Kysely, SQL directo u otro.
- Motor de base de datos: recomendado evaluar Postgres para relaciones y busqueda.
- Estrategia de auth: sesiones, JWT, proveedor externo o auth propia.
