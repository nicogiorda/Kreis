# Communities module

Responsabilidad: comunidades, membresias y datos propios de cada comunidad.

Incluye:

- Crear comunidades.
- Unirse o salir.
- Categorias de comunidad.
- Datos de popularidad propios del modulo.

No incluye posts publicados dentro de la comunidad; eso vive en `posts`.

## Endpoints

- `GET /api/v1/communities`: lista comunidades visibles.
- `POST /api/v1/communities`: crea una comunidad pendiente.
- `POST /api/v1/communities/:id/members`: une al usuario autenticado.
- `DELETE /api/v1/communities/:id/members`: quita al usuario autenticado.

Las operaciones de membresia solo aceptan comunidades con estado `Aceptado`.
Son idempotentes: repetir unirse o salir conserva el estado solicitado.
