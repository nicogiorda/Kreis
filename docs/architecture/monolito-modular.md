# Monolito modular

Esta base mantiene un solo repositorio y una sola aplicacion backend, pero separa el negocio por modulos. Para Kreis tiene sentido en esta etapa porque el producto todavia esta cambiando rapido: evita la coordinacion pesada de microservicios y, al mismo tiempo, deja limites claros para que backend y datos trabajen sin pisarse.

## Decision

Usar un monolito modular para el backend:

- Un deploy de API.
- Una base de datos principal.
- Modulos por dominio de producto.
- Contratos compartidos en `packages/shared/contracts`.
- Migraciones y documentacion de datos en `infra/database`.
- Runtime backend en Node.js con TypeScript.

## Por que no microservicios ahora

Kreis todavia necesita validar producto, modelo de datos y flujos principales. Separar servicios demasiado temprano agregaria trabajo de infraestructura, versionado, observabilidad, auth distribuida y comunicacion entre servicios antes de necesitarlo.

## Regla principal

Cada modulo es dueno de su negocio. Puede exponer casos de uso o contratos publicos, pero otros modulos no deberian importar directamente su infraestructura interna ni tocar sus tablas sin una migracion acordada.

## Capas dentro de cada modulo

```text
api/             Rutas, controladores, validacion de requests y DTOs HTTP
application/     Casos de uso y orquestacion del modulo
domain/          Entidades, reglas de negocio, value objects
infrastructure/  Repositorios, queries, adaptadores externos
tests/           Pruebas del modulo
```

## Modulos iniciales

- `auth`: identidad, sesiones, permisos y seguridad de acceso.
- `users`: usuarios, perfil, carrera, preferencias y datos visibles.
- `events`: eventos, interes/asistencia y datos publicos del evento.
- `communities`: comunidades, membresias, discovery de comunidades.
- `posts`: publicaciones, actividad, comentarios y reacciones.
- `discovery`: home feed, busqueda, recomendaciones y lecturas compuestas.
- `notifications`: recordatorios y avisos futuros.

## Datos

El equipo de datos trabaja desde `infra/database/`. Las migraciones viven en `infra/database/migrations`, el modelo conceptual en `infra/database/schema` y los seeds en `infra/database/seeds`.

La base sugerida es relacional. Si el equipo elige Postgres, Prisma, Drizzle u otro stack, esa decision deberia documentarse aca y reflejarse en `infra/database/README.md` antes de escribir migraciones reales.

## Node.js y Next.js

Node.js es correcto como runtime backend para este repo.

Next.js solo seria la decision correcta si Kreis pasa a ser una app full-stack Next, migrando el frontend actual desde Vite. Instalar Next dentro del repo sin migrar la app no crea automaticamente un backend util; dejaria dos frameworks frontend conviviendo y aumentaria la complejidad.

Para mantener el monolito modular actual, la opcion recomendada es una API Node.js en `apps/api/` y conservar el frontend Vite en `apps/web/`. Si mas adelante se elige Next, la migracion deberia planificarse como cambio de arquitectura, no como instalacion suelta.
