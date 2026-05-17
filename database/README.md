# Database

Base de trabajo para el equipo de datos. Este directorio concentra schema, migraciones, seeds y documentacion de persistencia.

## Estructura

```text
database/
  migrations/   Cambios versionados de schema
  schema/       Modelo conceptual, ERD y decisiones de tablas
  seeds/        Datos iniciales para desarrollo
  fixtures/     Datos chicos para tests o demos
```

## Convenciones

- Toda modificacion estructural debe pasar por una migracion.
- Las migraciones deben ser revisables y pequenas.
- Los seeds no reemplazan migraciones.
- Si una tabla pertenece a un modulo, coordinar cambios con ese modulo backend.

## Tecnologia pendiente

Todavia no se fija ORM ni motor. Recomendacion inicial: Postgres por relaciones, constraints, indices y busqueda de texto. Si el equipo decide otra cosa, documentarlo antes de crear migraciones reales.
