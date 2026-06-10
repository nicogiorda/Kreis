# Posts module

Responsabilidad: publicaciones, actividad, comentarios y reacciones.

Incluye:

- Crear posts dentro de comunidades.
- Feed de actividad por comunidad.
- Comentarios.
- Reacciones o score.

No es dueno de crear comunidades ni de membresias.

## Endpoints implementados

- `GET /api/v1/posts`: feed de posts de las comunidades aceptadas a las que pertenece el usuario.
- `POST /api/v1/posts`: crea un post en una comunidad aceptada.
- `GET /api/v1/posts/:id/comentarios`: devuelve el arbol de comentarios de un post.
- `POST /api/v1/posts/:id/comentarios`: crea un comentario raiz o una respuesta.

Para publicar, el usuario debe estar autenticado y ser miembro de la comunidad.
El body esperado es:

```json
{
  "id_comunidad": "1",
  "cuerpo": "Contenido del post"
}
```

Para responder a un comentario:

```json
{
  "cuerpo": "Contenido de la respuesta",
  "id_padre": "5"
}
```

El backend valida que `id_padre` exista y pertenezca al mismo post. El arbol se
arma en memoria a partir de una unica consulta plana ordenada cronologicamente.

Reacciones o score siguen pendientes.
