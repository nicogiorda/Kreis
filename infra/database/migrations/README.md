# Migrations

Usar una migracion por cambio de schema.

Formato sugerido:

```text
YYYYMMDDHHMMSS_short_description.sql
```

Ejemplo:

```text
20260517120000_create_events.sql
```

Cada migracion deberia indicar:

- Tablas/indices/constraints que crea o modifica.
- Modulo backend afectado.
- Si requiere backfill de datos.
