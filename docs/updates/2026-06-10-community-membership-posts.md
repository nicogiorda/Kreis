# Registro de trabajo - 2026-06-10

Este documento resume la implementacion de membresias de comunidades y posts persistentes.

## Estado de objetivos

| Objetivo | Estado |
|---|---|
| Ver comunidades | Implementado e integrado con frontend |
| Unirse a comunidad | Implementado e integrado con frontend |
| Crear comunidad | Implementado e integrado con frontend |
| Postear en una comunidad | Implementado e integrado con frontend |
| Comentarios anidados | Implementado e integrado con frontend |

## Membresias

### Unirse

```http
POST /api/v1/communities/:id/members
Authorization: Bearer <access_token>
```

Respuesta `200`:

```json
{
  "membership": {
    "legajo": 1234567,
    "id_comunidad": "1",
    "joined": true,
    "miembros": 4
  }
}
```

### Salir

```http
DELETE /api/v1/communities/:id/members
Authorization: Bearer <access_token>
```

La respuesta usa el mismo contrato con `joined: false`.

Ambas operaciones son idempotentes y solo funcionan sobre comunidades aceptadas.

## Posts

### Feed del usuario

```http
GET /api/v1/posts
Authorization: Bearer <access_token>
```

Devuelve posts de comunidades aceptadas donde el usuario es miembro, ordenados desde el mas reciente.

### Crear un post

```http
POST /api/v1/posts
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "id_comunidad": "1",
  "cuerpo": "Busco equipo para preparar el parcial."
}
```

Respuesta `201`:

```json
{
  "post": {
    "id": "10",
    "cuerpo": "Busco equipo para preparar el parcial.",
    "created_at": "2026-06-10T18:00:00.000Z",
    "autor": {
      "legajo": 1234567,
      "nombre": "Nicolas",
      "apellido": "Perez"
    },
    "comunidad": {
      "id": "1",
      "nombre": "Tecnologia UADE"
    },
    "comentarios": 0
  }
}
```

Errores relevantes:

- `401`: falta token o es invalido.
- `403 not_community_member`: el usuario no pertenece a la comunidad.
- `404 community_not_found`: la comunidad no existe o no esta aceptada.

## Integracion frontend

- Las comunidades se cargan desde la API y ya no desde datos mock.
- Unirse y salir actualiza la interfaz de forma optimista y revierte ante error.
- El composer solo permite publicar en comunidades aceptadas donde el usuario es miembro.
- Los posts se cargan desde la base y una publicacion nueva se agrega al feed con la respuesta real.
- La creacion de comunidades existente tambien quedo conectada al backend.

## Comentarios anidados

Implementados sobre la columna `comentario.id_padre` existente en Supabase.

- `GET /api/v1/posts/:id/comentarios`: devuelve el arbol completo.
- `POST /api/v1/posts/:id/comentarios`: crea comentarios raiz y respuestas.
- Se valida que el padre pertenezca al mismo post.
- Se agregaron indices para `id_post, id_padre` y para `id_padre`.
- El frontend carga los comentarios bajo demanda y permite responder.
- A partir del cuarto nivel, las ramas profundas se muestran colapsadas.
