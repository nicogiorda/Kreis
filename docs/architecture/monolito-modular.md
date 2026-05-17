# Monolito modular

Esta base mantiene un solo repositorio y una sola aplicacion backend, pero separa el negocio por modulos. Para Kreis tiene sentido en esta etapa porque el producto todavia esta cambiando rapido: evita la coordinacion pesada de microservicios y, al mismo tiempo, deja limites claros para que backend y datos trabajen sin pisarse.

## Decision

Usar un monolito modular para el backend:

- Un deploy de API.
- Una base de datos principal.
- Modulos por dominio de producto.
- Contratos compartidos en `shared/contracts`.
- Migraciones y documentacion de datos en `database`.

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

El equipo de datos trabaja desde `database/`. Las migraciones viven en `database/migrations`, el modelo conceptual en `database/schema` y los seeds en `database/seeds`.

La base sugerida es relacional. Si el equipo elige Postgres, Prisma, Drizzle u otro stack, esa decision deberia documentarse aca y reflejarse en `database/README.md` antes de escribir migraciones reales.
