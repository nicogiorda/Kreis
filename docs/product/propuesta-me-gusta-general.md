# Propuesta tecnica definitiva: Me gusta en posts y comentarios

Fecha: 2026-06-11

## Resumen ejecutivo

La propuesta es agregar la funcionalidad de "me gusta" en dos niveles del producto Kreis:

- Posts del feed de comunidades.
- Comentarios y respuestas dentro de cada post.

La arquitectura recomendada es la misma para ambos casos: guardar cada like individual en una tabla relacional y mantener un contador cacheado en la entidad principal. Para posts, el contador vive en `post.like_count`; para comentarios, en `comentario.like_count`.

Este enfoque evita calcular `COUNT(*)` cada vez que se carga el feed o se abre un hilo de comentarios. Es mas predecible para Supabase, reduce latencia y mantiene bajo el costo operativo en una primera etapa.

## Decision tecnica principal

Implementar likes con:

- Una tabla `post_like` para likes de posts.
- Una tabla `comentario_like` para likes de comentarios.
- Un contador `like_count` en `public.post`.
- Un contador `like_count` en `public.comentario`.
- Endpoints idempotentes para dar y quitar like.
- Validacion de acceso por membresia de comunidad.
- Actualizacion optimista en frontend.

No se recomienda calcular likes dinamicamente con `COUNT(*)` en cada lectura.

## Que logica se reutiliza

La logica de likes en posts y comentarios comparte el mismo patron:

- Un usuario puede dar un solo like por recurso.
- La clave unica es `(id_recurso, legajo)`.
- Dar like dos veces no duplica registros.
- Quitar like dos veces no falla.
- El contador se actualiza en base de datos con triggers.
- El backend valida que el usuario pertenezca a la comunidad del post.
- El frontend actualiza el contador al instante y corrige con la respuesta final del backend.
- Supabase no cobra por "like" como evento individual; el costo viene por almacenamiento, compute, IO y egress.

Lo que cambia entre posts y comentarios:

- Posts usan `post_like`, `post.like_count` y endpoints `/api/v1/posts/:id/like`.
- Comentarios usan `comentario_like`, `comentario.like_count` y endpoints `/api/v1/posts/:postId/comentarios/:commentId/like`.
- Posts se muestran directamente en el feed.
- Comentarios se cargan cuando se abre el hilo de comentarios.
- Comentarios requieren actualizar nodos dentro de un arbol de respuestas.

## Objetivo del cambio

Permitir que un usuario autenticado pueda:

- Ver cuantos likes tiene cada post.
- Ver cuantos likes tiene cada comentario.
- Saber si ya dio like a un post.
- Saber si ya dio like a un comentario.
- Dar like a un post.
- Dar like a un comentario.
- Quitar su like de un post.
- Quitar su like de un comentario.
- Ver el contador actualizado inmediatamente en la interfaz.

## Alcance funcional incluido

- Likes positivos en posts.
- Likes positivos en comentarios raiz.
- Likes positivos en respuestas anidadas.
- Un solo like por usuario por post.
- Un solo like por usuario por comentario.
- Contador visible en posts y comentarios.
- Estado visual activo cuando el usuario ya dio like.
- Persistencia en Supabase/Postgres.
- Seguridad por membresia de comunidad.
- Endpoints idempotentes.
- Feed con `like_count` y `viewer_has_liked`.
- Comentarios con `like_count` y `viewer_has_liked`.

## Fuera de alcance inicial

- Reacciones multiples tipo emoji.
- Dislikes o votos negativos.
- Notificaciones por likes.
- Realtime para sincronizar likes en vivo entre usuarios.
- Ranking de posts por likes.
- Ranking de comentarios por likes.
- Listado de usuarios que dieron like.
- Analiticas de likes.
- Moderacion especifica de likes.
- Algoritmo de feed basado en popularidad.

## Estado actual del sistema

Hoy el sistema ya tiene:

- Posts de comunidades en `public.post`.
- Comentarios en `public.comentario`.
- Comentarios anidados mediante `comentario.id_padre`.
- Relacion de post con comunidad mediante `post.id_comunidad`.
- Relacion de post con autor mediante `post.legajo`.
- Relacion de comentario con autor mediante `comentario.legajo`.
- Validacion de comunidades aceptadas y membresia en el modulo posts.
- Endpoint para listar feed:
  - `GET /api/v1/posts`
- Endpoint para crear posts:
  - `POST /api/v1/posts`
- Endpoint para listar comentarios:
  - `GET /api/v1/posts/:id/comentarios`
- Endpoint para crear comentarios:
  - `POST /api/v1/posts/:id/comentarios`
- Serializador de posts:
  - `apps/api/src/modules/posts/api/serialize-post.ts`
- Serializador de comentarios:
  - `apps/api/src/modules/posts/api/serialize-comment.ts`
- Repositorio de posts y comentarios:
  - `apps/api/src/modules/posts/data/posts-repository.ts`
- UI del feed:
  - `apps/web/src/components/communities/CommunitiesScreen.tsx`
- UI de comentarios:
  - `apps/web/src/components/communities/PostComments.tsx`
- Adaptador frontend:
  - `apps/web/src/api/posts.ts`

Hoy el frontend muestra un `score` en cada post, pero ese valor se asigna fijo como `1` en `adaptPost`. No representa likes reales de la base.

## Cambios en base de datos

### 1. Agregar contador de likes en posts

```sql
ALTER TABLE public.post
ADD COLUMN like_count integer NOT NULL DEFAULT 0;
```

### 2. Agregar contador de likes en comentarios

```sql
ALTER TABLE public.comentario
ADD COLUMN like_count integer NOT NULL DEFAULT 0;
```

### 3. Crear tabla de likes de posts

```sql
CREATE TABLE public.post_like (
  id_post bigint NOT NULL,
  legajo integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_like_pkey PRIMARY KEY (id_post, legajo),
  CONSTRAINT fk_post_like_post
    FOREIGN KEY (id_post)
    REFERENCES public.post(id_post)
    ON DELETE CASCADE,
  CONSTRAINT fk_post_like_usuario
    FOREIGN KEY (legajo)
    REFERENCES public.usuario(legajo)
    ON DELETE CASCADE
);
```

### 4. Crear tabla de likes de comentarios

```sql
CREATE TABLE public.comentario_like (
  id_comentario bigint NOT NULL,
  legajo integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comentario_like_pkey PRIMARY KEY (id_comentario, legajo),
  CONSTRAINT fk_comentario_like_comentario
    FOREIGN KEY (id_comentario)
    REFERENCES public.comentario(id_comentario)
    ON DELETE CASCADE,
  CONSTRAINT fk_comentario_like_usuario
    FOREIGN KEY (legajo)
    REFERENCES public.usuario(legajo)
    ON DELETE CASCADE
);
```

### 5. Crear indices para estado del usuario

```sql
CREATE INDEX post_like_legajo_id_post_idx
ON public.post_like (legajo, id_post);

CREATE INDEX comentario_like_legajo_id_comentario_idx
ON public.comentario_like (legajo, id_comentario);
```

Motivo:

- El feed necesita resolver que posts ya likeo el usuario.
- El hilo de comentarios necesita resolver que comentarios ya likeo el usuario.
- Las consultas esperadas son `WHERE legajo = ? AND id_post IN (...)` y `WHERE legajo = ? AND id_comentario IN (...)`.

### 6. Crear triggers para posts

```sql
CREATE OR REPLACE FUNCTION public.increment_post_like_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.post
  SET like_count = like_count + 1
  WHERE id_post = NEW.id_post;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.decrement_post_like_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.post
  SET like_count = GREATEST(like_count - 1, 0)
  WHERE id_post = OLD.id_post;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_like_after_insert
AFTER INSERT ON public.post_like
FOR EACH ROW
EXECUTE FUNCTION public.increment_post_like_count();

CREATE TRIGGER post_like_after_delete
AFTER DELETE ON public.post_like
FOR EACH ROW
EXECUTE FUNCTION public.decrement_post_like_count();
```

### 7. Crear triggers para comentarios

```sql
CREATE OR REPLACE FUNCTION public.increment_comentario_like_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.comentario
  SET like_count = like_count + 1
  WHERE id_comentario = NEW.id_comentario;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.decrement_comentario_like_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.comentario
  SET like_count = GREATEST(like_count - 1, 0)
  WHERE id_comentario = OLD.id_comentario;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comentario_like_after_insert
AFTER INSERT ON public.comentario_like
FOR EACH ROW
EXECUTE FUNCTION public.increment_comentario_like_count();

CREATE TRIGGER comentario_like_after_delete
AFTER DELETE ON public.comentario_like
FOR EACH ROW
EXECUTE FUNCTION public.decrement_comentario_like_count();
```

### 8. Backfill de seguridad

```sql
UPDATE public.post p
SET like_count = COALESCE(l.likes, 0)
FROM (
  SELECT id_post, COUNT(*)::integer AS likes
  FROM public.post_like
  GROUP BY id_post
) l
WHERE p.id_post = l.id_post;

UPDATE public.comentario c
SET like_count = COALESCE(l.likes, 0)
FROM (
  SELECT id_comentario, COUNT(*)::integer AS likes
  FROM public.comentario_like
  GROUP BY id_comentario
) l
WHERE c.id_comentario = l.id_comentario;
```

## Cambios en Prisma

Actualizar `prisma/schema.prisma`.

### Modelo `post`

Agregar:

```prisma
like_count Int         @default(0)
post_like  post_like[]
```

### Modelo `comentario`

Agregar:

```prisma
like_count      Int               @default(0)
comentario_like comentario_like[]
```

### Modelo `usuario`

Agregar:

```prisma
post_like       post_like[]
comentario_like comentario_like[]
```

### Modelo `post_like`

```prisma
model post_like {
  id_post    BigInt
  legajo     Int
  created_at DateTime @default(now()) @db.Timestamptz(6)
  post       post     @relation(fields: [id_post], references: [id_post], onDelete: Cascade, onUpdate: NoAction, map: "fk_post_like_post")
  usuario    usuario  @relation(fields: [legajo], references: [legajo], onDelete: Cascade, onUpdate: NoAction, map: "fk_post_like_usuario")

  @@id([id_post, legajo])
  @@index([legajo, id_post], map: "post_like_legajo_id_post_idx")
  @@schema("public")
}
```

### Modelo `comentario_like`

```prisma
model comentario_like {
  id_comentario BigInt
  legajo        Int
  created_at    DateTime   @default(now()) @db.Timestamptz(6)
  comentario    comentario @relation(fields: [id_comentario], references: [id_comentario], onDelete: Cascade, onUpdate: NoAction, map: "fk_comentario_like_comentario")
  usuario       usuario    @relation(fields: [legajo], references: [legajo], onDelete: Cascade, onUpdate: NoAction, map: "fk_comentario_like_usuario")

  @@id([id_comentario, legajo])
  @@index([legajo, id_comentario], map: "comentario_like_legajo_id_comentario_idx")
  @@schema("public")
}
```

Luego regenerar Prisma Client.

## Cambios en backend

Archivos principales:

- `apps/api/src/modules/posts/data/posts-repository.ts`
- `apps/api/src/modules/posts/api/routes.ts`
- `apps/api/src/modules/posts/api/serialize-post.ts`
- `apps/api/src/modules/posts/api/serialize-comment.ts`

### 1. Extender tipos de post

`CommunityPost` debe incluir:

```ts
like_count: number;
viewer_has_liked: boolean;
```

### 2. Extender tipos de comentario

`PostComment` debe incluir:

```ts
like_count: number;
viewer_has_liked: boolean;
```

`PostCommentTree` mantiene `respuestas`.

### 3. Actualizar listado de feed

`listCommunityFeed(legajo)` debe:

- Traer posts de comunidades aceptadas donde el usuario es miembro.
- Incluir `like_count`.
- Traer cantidad de comentarios.
- Buscar likes del usuario sobre los posts devueltos.
- Marcar `viewer_has_liked`.

Consulta auxiliar recomendada:

```ts
const likedPosts = await prisma.post_like.findMany({
  where: {
    legajo,
    id_post: {
      in: postIds
    }
  },
  select: {
    id_post: true
  }
});
```

### 4. Actualizar listado de comentarios

`listPostComments(legajo, id_post)` debe:

- Validar acceso al post.
- Traer comentarios del post.
- Incluir `like_count`.
- Buscar likes del usuario sobre los comentarios devueltos.
- Marcar `viewer_has_liked`.
- Armar el arbol de respuestas.

Consulta auxiliar recomendada:

```ts
const likedComments = await prisma.comentario_like.findMany({
  where: {
    legajo,
    id_comentario: {
      in: commentIds
    }
  },
  select: {
    id_comentario: true
  }
});
```

### 5. Agregar funciones de repositorio para posts

```ts
export async function likeCommunityPost(
  legajo: number,
  id_post: bigint
): Promise<LikeCommunityPostResult>
```

```ts
export async function unlikeCommunityPost(
  legajo: number,
  id_post: bigint
): Promise<LikeCommunityPostResult>
```

Resultado esperado:

```ts
type LikeCommunityPostResult =
  | {
      status: "ok";
      id_post: bigint;
      liked: boolean;
      like_count: number;
    }
  | { status: "post_not_found" }
  | { status: "not_community_member" };
```

### 6. Agregar funciones de repositorio para comentarios

```ts
export async function likePostComment(
  legajo: number,
  id_post: bigint,
  id_comentario: bigint
): Promise<LikePostCommentResult>
```

```ts
export async function unlikePostComment(
  legajo: number,
  id_post: bigint,
  id_comentario: bigint
): Promise<LikePostCommentResult>
```

Resultado esperado:

```ts
type LikePostCommentResult =
  | {
      status: "ok";
      id_comentario: bigint;
      liked: boolean;
      like_count: number;
    }
  | { status: "post_not_found" }
  | { status: "not_community_member" }
  | { status: "comment_not_found" };
```

### 7. Insertar likes de forma idempotente

Post:

```ts
await prisma.post_like.upsert({
  where: {
    id_post_legajo: {
      id_post,
      legajo
    }
  },
  create: {
    id_post,
    legajo
  },
  update: {}
});
```

Comentario:

```ts
await prisma.comentario_like.upsert({
  where: {
    id_comentario_legajo: {
      id_comentario,
      legajo
    }
  },
  create: {
    id_comentario,
    legajo
  },
  update: {}
});
```

### 8. Quitar likes de forma idempotente

Post:

```ts
await prisma.post_like.deleteMany({
  where: {
    id_post,
    legajo
  }
});
```

Comentario:

```ts
await prisma.comentario_like.deleteMany({
  where: {
    id_comentario,
    legajo
  }
});
```

Despues de cada operacion se debe leer el `like_count` actualizado desde `post` o `comentario`.

## Endpoints nuevos

### Dar like a post

```http
POST /api/v1/posts/:id/like
Authorization: Bearer <token>
```

Respuesta:

```json
{
  "post_like": {
    "id_post": "45",
    "liked": true,
    "like_count": 12
  }
}
```

### Quitar like a post

```http
DELETE /api/v1/posts/:id/like
Authorization: Bearer <token>
```

Respuesta:

```json
{
  "post_like": {
    "id_post": "45",
    "liked": false,
    "like_count": 11
  }
}
```

### Dar like a comentario

```http
POST /api/v1/posts/:postId/comentarios/:commentId/like
Authorization: Bearer <token>
```

Respuesta:

```json
{
  "comment_like": {
    "id_comentario": "123",
    "liked": true,
    "like_count": 8
  }
}
```

### Quitar like a comentario

```http
DELETE /api/v1/posts/:postId/comentarios/:commentId/like
Authorization: Bearer <token>
```

Respuesta:

```json
{
  "comment_like": {
    "id_comentario": "123",
    "liked": false,
    "like_count": 7
  }
}
```

### Codigos de error esperados

- `400`: ids invalidos o payload invalido.
- `401`: token faltante o invalido.
- `403`: usuario sin perfil Kreis o sin membresia en la comunidad.
- `404`: post inexistente, comunidad no aceptada o comentario inexistente.
- `200`: operacion exitosa, incluso si ya estaba likeado o ya estaba deslikeado.

## Contratos API actualizados

### Feed de posts

`GET /api/v1/posts` debe devolver:

```json
{
  "posts": [
    {
      "id": "45",
      "cuerpo": "Alguien se suma al torneo?",
      "created_at": "2026-06-11T12:00:00.000Z",
      "like_count": 12,
      "viewer_has_liked": true,
      "autor": {
        "legajo": 1001,
        "nombre": "Santiago",
        "apellido": "Gimenez"
      },
      "comunidad": {
        "id": "5",
        "nombre": "Gaming"
      },
      "comentarios": 3
    }
  ]
}
```

### Comentarios

`GET /api/v1/posts/:id/comentarios` debe devolver:

```json
{
  "comentarios": [
    {
      "id": "123",
      "id_post": "45",
      "id_padre": null,
      "cuerpo": "Me sumo!",
      "created_at": "2026-06-11T12:00:00.000Z",
      "like_count": 8,
      "viewer_has_liked": true,
      "autor": {
        "legajo": 1001,
        "nombre": "Santiago",
        "apellido": "Gimenez"
      },
      "respuestas": []
    }
  ],
  "total_comentarios": 1
}
```

## Cambios en frontend web

Archivos principales:

- `apps/web/src/api/posts.ts`
- `apps/web/src/types.ts`
- `apps/web/src/components/communities/CommunitiesScreen.tsx`
- `apps/web/src/components/communities/PostComments.tsx`

### 1. Actualizar tipos

En `ActivityPost`:

```ts
likeCount: number;
viewerHasLiked: boolean;
```

Recomendacion:

- Reemplazar `score` por `likeCount`.
- Si se busca minimizar cambios, mantener `score` temporalmente pero mapearlo desde `like_count`.

En `PostComment`:

```ts
likeCount: number;
viewerHasLiked: boolean;
```

### 2. Actualizar adaptadores API

En `PostResponse`:

```ts
like_count: number;
viewer_has_liked: boolean;
```

En `CommentResponse`:

```ts
like_count: number;
viewer_has_liked: boolean;
```

En `adaptPost`:

```ts
likeCount: post.like_count,
viewerHasLiked: post.viewer_has_liked
```

En `adaptComment`:

```ts
likeCount: comment.like_count,
viewerHasLiked: comment.viewer_has_liked
```

### 3. Agregar funciones API frontend

```ts
export async function likePost(
  postId: string,
  accessToken: string
): Promise<{ postId: string; liked: boolean; likeCount: number }>
```

```ts
export async function unlikePost(
  postId: string,
  accessToken: string
): Promise<{ postId: string; liked: boolean; likeCount: number }>
```

```ts
export async function likePostComment(
  postId: string,
  commentId: string,
  accessToken: string
): Promise<{ commentId: string; liked: boolean; likeCount: number }>
```

```ts
export async function unlikePostComment(
  postId: string,
  commentId: string,
  accessToken: string
): Promise<{ commentId: string; liked: boolean; likeCount: number }>
```

### 4. Cambiar UI de posts

En `CommunityPost`, el bloque visual actual basado en `score` debe convertirse en un boton real de like.

Requisitos:

- Usar icono de corazon o pulgar.
- Mostrar contador real.
- Usar `aria-pressed={post.viewerHasLiked}`.
- Estado visual activo si el usuario ya dio like.
- Evitar hablar de "votos" si no hay dislike.
- Actualizar optimistamente y revertir si falla.

### 5. Cambiar UI de comentarios

En `CommentNode`, agregar boton junto a "Responder".

Requisitos:

- Usar icono de corazon o pulgar.
- Mostrar contador real.
- Usar `aria-pressed={comment.viewerHasLiked}`.
- Estado visual activo si el usuario ya dio like.
- Funcionar igual en comentarios raiz y respuestas anidadas.
- Actualizar optimistamente y revertir si falla.

### 6. Helpers de estado

Para posts:

```ts
function updatePostLikeState(
  postId: string,
  liked: boolean,
  likeCount: number
): void
```

Para comentarios anidados:

```ts
function updateCommentById(
  comments: PostComment[],
  commentId: string,
  updater: (comment: PostComment) => PostComment
): PostComment[]
```

## Costos esperados en Supabase

Supabase no cobra un precio especifico por cada like. El costo depende de:

- Compute de la base.
- Almacenamiento.
- IO de lectura/escritura.
- Egress.
- Edge Functions si se usaran.
- Realtime si se usara.

Esta propuesta no requiere Edge Functions ni Realtime en la primera version.

Fuentes consultadas:

- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/platform/compute-and-disk

### Estimacion de almacenamiento

Cada like guarda:

- Id del recurso (`id_post` o `id_comentario`).
- `legajo`.
- `created_at`.
- indice primario.
- indice auxiliar por usuario.
- overhead interno de Postgres.

Estimacion conservadora:

- 1 millon de likes totales: aproximadamente 200 MB a 500 MB.
- 10 millones de likes totales: aproximadamente 2 GB a 5 GB.

Si se implementan likes en posts y comentarios, el total es la suma de ambas tablas: `post_like` + `comentario_like`.

### Costo de lectura

Feed:

- 1 query para traer posts.
- 1 query para traer likes del usuario sobre esos posts.

Comentarios:

- 1 query para traer comentarios del post.
- 1 query para traer likes del usuario sobre esos comentarios.

No se hace `COUNT(*)` por post ni por comentario.

### Costo de escritura

Cada like:

- 1 insert en tabla de likes.
- 1 update automatico del contador por trigger.

Cada unlike:

- 1 delete en tabla de likes.
- 1 update automatico del contador por trigger.

Impacto esperado:

- Bajo para la etapa actual de Kreis.
- El feed es mas sensible que comentarios porque se carga con mas frecuencia.
- El principal riesgo aparece si un post o comentario recibe muchos likes simultaneos, porque todos actualizan el mismo contador.

## Riesgos y mitigaciones

### Riesgo: costo alto por conteos dinamicos

Mitigacion:

- Guardar `like_count` en `post` y `comentario`.
- Actualizar con triggers.
- Evitar `COUNT(*)` por recurso en la carga normal.

### Riesgo: duplicacion de likes

Mitigacion:

- Claves primarias `(id_post, legajo)` y `(id_comentario, legajo)`.
- Operaciones idempotentes con `upsert` y `deleteMany`.

### Riesgo: usuario interactua fuera de sus comunidades

Mitigacion:

- Reutilizar validacion de acceso del post.
- Verificar que el comentario pertenece al post indicado.
- Mantener la regla: solo miembros de la comunidad pueden ver y modificar likes.

### Riesgo: contador desincronizado

Mitigacion:

- Triggers en base.
- Backfill SQL.
- Posible auditoria de mantenimiento en el futuro.

### Riesgo: confusion entre score, votos y likes

Mitigacion:

- Renombrar visual y tecnicamente a `likeCount`.
- Usar icono de me gusta.
- No mostrar `^` ni hablar de votos si no existe downvote.

### Riesgo: UI inconsistente ante error de red

Mitigacion:

- Actualizacion optimista.
- Rollback si falla.
- Usar la respuesta del backend como fuente final.

## Plan de implementacion

### Paso 1: Base de datos

- Crear migracion SQL en `infra/database/migrations`.
- Agregar `post.like_count`.
- Agregar `comentario.like_count`.
- Crear `post_like`.
- Crear `comentario_like`.
- Crear indices auxiliares.
- Crear triggers.
- Ejecutar backfill.

### Paso 2: Prisma

- Actualizar `prisma/schema.prisma`.
- Regenerar Prisma Client.
- Verificar nombres compuestos para `upsert`.

### Paso 3: Backend

- Extender `CommunityPost`.
- Extender `PostComment`.
- Actualizar `listCommunityFeed`.
- Actualizar `listPostComments`.
- Agregar funciones de like/unlike para posts.
- Agregar funciones de like/unlike para comentarios.
- Agregar endpoints nuevos.
- Actualizar serializadores.

### Paso 4: Frontend

- Actualizar tipos.
- Actualizar adaptadores API.
- Agregar funciones API de like/unlike.
- Convertir `score` de posts en `likeCount` real.
- Agregar boton de like en comentarios.
- Implementar actualizacion optimista.
- Implementar rollback ante error.

### Paso 5: QA

Casos a probar:

- Usuario ve posts con `like_count = 0`.
- Usuario ve comentarios con `like_count = 0`.
- Usuario da like a un post y el contador sube.
- Usuario quita like a un post y el contador baja.
- Usuario da like a un comentario raiz y el contador sube.
- Usuario da like a una respuesta anidada y el contador sube.
- Usuario no puede duplicar likes.
- Usuario no miembro no puede dar like.
- Usuario no miembro no ve posts fuera de sus comunidades.
- Al recargar, `viewer_has_liked` sigue correcto.
- Al borrar un post, sus likes se eliminan por cascade.
- Al borrar un comentario, sus likes se eliminan por cascade.
- El feed no hace conteos por post.
- Los comentarios no hacen conteos por comentario.

## Esfuerzo estimado

Estimacion para primera version sin Realtime ni notificaciones:

- Base de datos y Prisma: 0.75 a 1 dia.
- Backend: 1.5 a 2 dias.
- Frontend: 1.5 a 2 dias.
- QA funcional: 0.75 a 1 dia.

Total estimado: 4 a 6 dias de trabajo.

Si se implementa primero una sola parte, conviene hacerla con helpers reutilizables para que la segunda parte sea mas rapida.

## Decisiones que deben aprobar los lideres

1. Aprobar que el alcance inicial sea like positivo, sin dislike.
2. Aprobar likes en posts y comentarios en la misma iniciativa.
3. Aprobar `post.like_count` y `comentario.like_count`.
4. Aprobar las tablas `post_like` y `comentario_like`.
5. Aprobar que el `score` visual actual pase a ser `likeCount` real.
6. Aprobar que no se use Realtime en la primera version.
7. Aprobar que no se muestren usuarios que dieron like.
8. Aprobar que solo miembros de la comunidad puedan ver y modificar likes.

## Criterio de aprobacion

El cambio se considera listo cuando:

- El feed devuelve `like_count` y `viewer_has_liked`.
- Los comentarios devuelven `like_count` y `viewer_has_liked`.
- Dar like y quitar like son operaciones idempotentes.
- La UI muestra contador real y estado activo en posts.
- La UI muestra contador real y estado activo en comentarios.
- No hay `COUNT(*)` por post en la carga normal del feed.
- No hay `COUNT(*)` por comentario en la carga normal del hilo.
- La base tiene indices para las consultas esperadas.
- El usuario no puede interactuar con contenido fuera de sus comunidades.

## Recomendacion final

Recomiendo implementar "me gusta" en posts y comentarios con una arquitectura comun: tablas de relacion, contadores cacheados, triggers en base, endpoints idempotentes y UI optimista.

Este enfoque es el mas simple de explicar, el mas barato de operar en Supabase para la etapa actual y el mas facil de extender en el futuro si Kreis decide agregar notificaciones, ranking o analiticas.
