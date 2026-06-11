# Propuesta tecnica: likes en comentarios

Fecha: 2026-06-11

## Resumen ejecutivo

La propuesta es agregar la capacidad de dar "me gusta" a comentarios dentro de los posts de comunidades en Kreis.

El cambio recomendado es guardar cada like individual en una tabla nueva y mantener un contador `like_count` dentro de cada comentario. De esta forma, cada vez que el frontend trae comentarios, recibe la cantidad de likes sin recalcular `COUNT(*)` sobre toda la tabla.

Con esta arquitectura, el impacto de costo en Supabase deberia ser bajo para una etapa inicial o media. El costo no viene de "cobrar por like", sino del consumo adicional de base de datos, CPU/IO, almacenamiento y transferencia. El principal riesgo de costo seria implementar los conteos de forma dinamica en cada carga de comentarios.

## Objetivo del cambio

Permitir que un usuario autenticado pueda:

- Ver cuantas personas dieron like a cada comentario.
- Saber si el ya dio like a cada comentario.
- Dar like a un comentario.
- Quitar su like de un comentario.
- Ver el contador actualizado inmediatamente en la interfaz.

## Alcance funcional

Incluido en esta propuesta:

- Likes sobre comentarios raiz y respuestas anidadas.
- Un solo like por usuario por comentario.
- Boton de like en cada comentario.
- Contador visible junto al comentario.
- Estado visual cuando el usuario ya dio like.
- Endpoints idempotentes para dar y quitar like.
- Validacion de acceso: solo miembros de la comunidad del post pueden ver o modificar likes.
- Persistencia en Supabase/Postgres.

Fuera de alcance por ahora:

- Likes en posts.
- Reacciones multiples tipo emoji.
- Notificaciones por likes.
- Ranking o feed ordenado por likes.
- Realtime para sincronizar likes entre usuarios conectados.
- Listado de usuarios que dieron like.
- Moderacion especifica de likes.

## Estado actual del sistema

Hoy el sistema ya tiene:

- Posts de comunidades en `public.post`.
- Comentarios en `public.comentario`.
- Comentarios anidados mediante `comentario.id_padre`.
- Indices existentes para traer comentarios por post y padre:
  - `comentario_id_post_id_padre_idx`
  - `comentario_id_padre_idx`
- Endpoint para listar comentarios:
  - `GET /api/v1/posts/:id/comentarios`
- Endpoint para crear comentarios:
  - `POST /api/v1/posts/:id/comentarios`
- Serializador de comentarios en `apps/api/src/modules/posts/api/serialize-comment.ts`.
- UI de comentarios en `apps/web/src/components/communities/PostComments.tsx`.

Hoy el comentario enviado al frontend no incluye likes ni estado del usuario.

## Cambios en base de datos

### 1. Agregar contador al comentario

Agregar columna en `public.comentario`:

```sql
ALTER TABLE public.comentario
ADD COLUMN like_count integer NOT NULL DEFAULT 0;
```

Motivo:

- Evita calcular `COUNT(*)` cada vez que se cargan comentarios.
- Hace que listar comentarios siga siendo una lectura simple.
- Permite mostrar likes siempre que se trae informacion del sistema.

### 2. Crear tabla de likes

Crear tabla nueva:

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

Motivo:

- La clave primaria `(id_comentario, legajo)` impide likes duplicados.
- `ON DELETE CASCADE` elimina likes si se borra el comentario o usuario.
- Permite auditoria minima de quien dio like y cuando.

### 3. Agregar indice para estado del usuario

```sql
CREATE INDEX comentario_like_legajo_id_comentario_idx
ON public.comentario_like (legajo, id_comentario);
```

Motivo:

- Cuando se listan los comentarios de un post, el backend necesita saber cuales de esos comentarios fueron likeados por el usuario autenticado.
- La consulta esperada es: `WHERE legajo = ? AND id_comentario IN (...)`.

### 4. Mantener contador sincronizado

Crear triggers para actualizar `comentario.like_count` en insert/delete de `comentario_like`:

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

Motivo:

- La consistencia queda protegida en la base, no solo en el codigo backend.
- Si en el futuro otro proceso inserta o borra likes, el contador sigue correcto.

### 5. Backfill de seguridad

Si la tabla se crea vacia, no hay likes historicos que migrar. Igual conviene dejar el backfill preparado:

```sql
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

Actualizar `prisma/schema.prisma`:

### Modelo `comentario`

Agregar:

```prisma
like_count      Int               @default(0)
comentario_like comentario_like[]
```

### Modelo nuevo `comentario_like`

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

### Modelo `usuario`

Agregar relacion:

```prisma
comentario_like comentario_like[]
```

Luego regenerar Prisma Client.

## Cambios en backend

Archivos principales:

- `apps/api/src/modules/posts/data/posts-repository.ts`
- `apps/api/src/modules/posts/api/routes.ts`
- `apps/api/src/modules/posts/api/serialize-comment.ts`
- Tests del modulo posts, si se agregan en esta etapa.

### 1. Extender el tipo de comentario

`PostComment` debe incluir:

```ts
like_count: number;
viewer_has_liked: boolean;
```

`PostCommentTree` mantiene `respuestas`.

### 2. Cambiar consulta de listado de comentarios

Hoy `listPostComments` trae comentarios por `id_post`, incluye autor y arma el arbol.

Debe seguir trayendo todos los comentarios del post, pero ademas:

- Incluir `like_count`.
- Consultar `comentario_like` para el usuario autenticado y los comentarios devueltos.
- Marcar `viewer_has_liked = true` en los comentarios que correspondan.

Forma recomendada:

1. Buscar comentarios del post.
2. Extraer ids de comentarios.
3. Buscar likes del usuario:

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

4. Armar `Set` con los ids likeados.
5. Construir el arbol con `viewer_has_liked`.

Esto evita un query por comentario.

### 3. Crear endpoint para dar like

Nuevo endpoint:

```http
POST /api/v1/posts/:postId/comentarios/:commentId/like
```

Validaciones:

- Token obligatorio.
- Usuario con perfil Kreis.
- `postId` numerico.
- `commentId` numerico.
- El post debe existir y pertenecer a una comunidad aceptada.
- El usuario debe ser miembro de la comunidad.
- El comentario debe existir y pertenecer a ese post.

Comportamiento:

- Si el usuario no habia dado like, insertar en `comentario_like`.
- Si el usuario ya habia dado like, no duplicar ni fallar.
- Devolver el comentario actualizado en forma minima.

Respuesta recomendada:

```json
{
  "comment_like": {
    "id_comentario": "123",
    "liked": true,
    "like_count": 8
  }
}
```

Codigo de estado:

- `200 OK` si ya existia o se creo correctamente.
- `401` sin token o token invalido.
- `403` si no es miembro de la comunidad.
- `404` si el post o comentario no existe.
- `400` si los ids no son numericos.

### 4. Crear endpoint para quitar like

Nuevo endpoint:

```http
DELETE /api/v1/posts/:postId/comentarios/:commentId/like
```

Validaciones:

- Las mismas que el endpoint de dar like.

Comportamiento:

- Si el like existe, borrarlo.
- Si el like no existe, no fallar.
- Devolver contador actual.

Respuesta recomendada:

```json
{
  "comment_like": {
    "id_comentario": "123",
    "liked": false,
    "like_count": 7
  }
}
```

Codigo de estado:

- `200 OK` en exito idempotente.
- `401`, `403`, `404`, `400` segun validacion.

### 5. Implementar funciones de repositorio

Agregar en `posts-repository.ts`:

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

Estados esperados:

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

Para validar acceso, reutilizar `findPostAccess`.

Para validar comentario:

```ts
const comment = await prisma.comentario.findFirst({
  where: {
    id_comentario,
    id_post
  },
  select: {
    id_comentario: true,
    like_count: true
  }
});
```

Para insertar like:

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

Para borrar like:

```ts
await prisma.comentario_like.deleteMany({
  where: {
    id_comentario,
    legajo
  }
});
```

Despues de la operacion, leer `like_count` actualizado desde `comentario`.

### 6. Actualizar serializador

`serializeComment` debe devolver:

```json
{
  "id": "123",
  "id_post": "45",
  "id_padre": null,
  "cuerpo": "Texto",
  "created_at": "2026-06-11T...",
  "like_count": 8,
  "viewer_has_liked": true,
  "autor": {
    "legajo": 1234,
    "nombre": "Nombre",
    "apellido": "Apellido"
  },
  "respuestas": []
}
```

## Cambios en frontend web

Archivos principales:

- `apps/web/src/api/posts.ts`
- `apps/web/src/types.ts`
- `apps/web/src/components/communities/PostComments.tsx`

### 1. Actualizar tipos

En `PostComment` agregar:

```ts
likeCount: number;
viewerHasLiked: boolean;
```

En `CommentResponse` agregar:

```ts
like_count: number;
viewer_has_liked: boolean;
```

En `adaptComment` mapear:

```ts
likeCount: comment.like_count,
viewerHasLiked: comment.viewer_has_liked
```

### 2. Agregar funciones API

En `apps/web/src/api/posts.ts`:

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

### 3. Agregar boton en cada comentario

En `CommentNode` agregar un boton junto a "Responder":

- Icono de corazon o pulgar.
- Texto/contador: `8`.
- Estado activo si `viewerHasLiked = true`.
- `aria-pressed` para accesibilidad.
- `disabled` o estado de carga mientras se envia la accion.

Ejemplo visual esperado:

```txt
Nombre Apellido · hace 2 min
Comentario...
[corazon] 8   Responder
```

### 4. Actualizacion optimista

Al tocar like:

- Cambiar visualmente el estado de inmediato.
- Sumar o restar 1 al contador local.
- Llamar al backend.
- Si el backend falla, revertir el estado y mostrar error breve.
- Si el backend responde con otro contador, usar el contador del backend como fuente final.

Motivo:

- La interaccion se siente instantanea.
- El backend sigue siendo la fuente de verdad.

### 5. Actualizar comentarios anidados

Como los comentarios son un arbol, se necesita helper para modificar un comentario por id:

```ts
function updateCommentById(
  comments: PostComment[],
  commentId: string,
  updater: (comment: PostComment) => PostComment
): PostComment[]
```

Este helper sirve para:

- Actualizar `likeCount`.
- Actualizar `viewerHasLiked`.
- Revertir si falla.

## Contrato API final

### Listar comentarios

Request:

```http
GET /api/v1/posts/:id/comentarios
Authorization: Bearer <token>
```

Response:

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

### Dar like

Request:

```http
POST /api/v1/posts/:postId/comentarios/:commentId/like
Authorization: Bearer <token>
```

Response:

```json
{
  "comment_like": {
    "id_comentario": "123",
    "liked": true,
    "like_count": 8
  }
}
```

### Quitar like

Request:

```http
DELETE /api/v1/posts/:postId/comentarios/:commentId/like
Authorization: Bearer <token>
```

Response:

```json
{
  "comment_like": {
    "id_comentario": "123",
    "liked": false,
    "like_count": 7
  }
}
```

## Costos esperados en Supabase

Supabase no cobra un precio especifico por cada like. El costo depende de recursos consumidos:

- Compute de la base.
- Almacenamiento de base de datos.
- Egress de datos.
- Uso de Edge Functions, si se usaran.
- Realtime, si se usara.

En esta propuesta no se necesita Edge Function ni Realtime para la primera version.

Segun la documentacion de Supabase consultada el 2026-06-11:

- Los planes pagos tienen una cuota incluida y luego overage para egress y almacenamiento.
- En Pro/Team se incluye una cuota de base por proyecto y el excedente de base se cobra por GB.
- El compute se cobra por proyecto/instancia, no por cantidad de likes individualmente.

Fuentes:

- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/platform/compute-and-disk

### Estimacion de almacenamiento

Cada like guarda:

- `id_comentario`
- `legajo`
- `created_at`
- indice primario
- indice auxiliar por usuario
- overhead interno de Postgres

Estimacion conservadora:

- 1 millon de likes: aproximadamente 200 MB a 500 MB.
- 10 millones de likes: aproximadamente 2 GB a 5 GB.

Esta estimacion puede variar por configuracion real, indices y mantenimiento interno de Postgres.

### Costo de lectura

Lectura recomendada al abrir comentarios:

- 1 query para traer comentarios del post.
- 1 query para traer los likes del usuario sobre esos comentarios.

No se hace `COUNT(*)` por comentario.

Impacto esperado:

- Bajo para posts con volumen normal de comentarios.
- Controlado incluso con comentarios anidados.
- Escalable mientras haya indices correctos.

### Costo de escritura

Cada like:

- 1 insert en `comentario_like`.
- 1 update automatico del contador por trigger.

Cada unlike:

- 1 delete en `comentario_like`.
- 1 update automatico del contador por trigger.

Impacto esperado:

- Bajo en volumen normal.
- Si un comentario recibe mucha actividad simultanea, el contador puede generar contencion de escritura sobre esa fila. Para Kreis, ese riesgo parece bajo en la etapa actual.

## Riesgos y mitigaciones

### Riesgo: conteos caros en cada carga

Si se calcula `COUNT(*)` por cada comentario, el costo y la latencia crecen rapidamente.

Mitigacion:

- Guardar `like_count` en `comentario`.
- Actualizarlo con trigger.

### Riesgo: likes duplicados

Un usuario podria intentar dar like varias veces.

Mitigacion:

- Clave primaria `(id_comentario, legajo)`.
- Endpoint idempotente con `upsert`.

### Riesgo: usuario da like a comentarios de comunidades donde no pertenece

Mitigacion:

- Reutilizar validacion `findPostAccess`.
- Validar que el comentario pertenezca al post indicado.

### Riesgo: contador desincronizado

Mitigacion:

- Trigger en base.
- Backfill SQL disponible.
- Posible tarea de auditoria si en el futuro hay inconsistencias.

### Riesgo: UI inconsistente ante error de red

Mitigacion:

- Actualizacion optimista con rollback.
- Usar respuesta del backend como fuente final.

## Plan de implementacion

### Paso 1: Base de datos

- Crear migracion SQL en `infra/database/migrations`.
- Agregar columna `comentario.like_count`.
- Crear tabla `comentario_like`.
- Crear indice por `legajo, id_comentario`.
- Crear triggers de incremento/decremento.
- Ejecutar backfill.

### Paso 2: Prisma

- Actualizar `prisma/schema.prisma`.
- Regenerar Prisma Client.
- Verificar que el nombre compuesto de la PK quede usable para `upsert`.

### Paso 3: Backend

- Extender tipos `PostComment` y `PostCommentTree`.
- Actualizar `listPostComments` para incluir `like_count` y `viewer_has_liked`.
- Agregar funciones `likePostComment` y `unlikePostComment`.
- Agregar rutas `POST` y `DELETE`.
- Agregar serializacion de respuesta.
- Mantener errores consistentes con el modulo actual.

### Paso 4: Frontend

- Actualizar tipos en `apps/web/src/types.ts`.
- Actualizar adaptadores en `apps/web/src/api/posts.ts`.
- Agregar funciones API para like/unlike.
- Agregar boton de like en `PostComments.tsx`.
- Implementar actualizacion optimista.
- Agregar estado de error y rollback.

### Paso 5: QA

Casos a probar:

- Usuario ve comentarios con `like_count = 0`.
- Usuario da like y el contador sube a 1.
- Usuario vuelve a tocar y se quita el like.
- Usuario no puede duplicar likes.
- Usuario no miembro no puede dar like.
- Usuario no miembro no puede ver likes de comentarios del post.
- Comentario raiz y respuesta anidada funcionan igual.
- Al recargar la pagina, `viewer_has_liked` sigue correcto.
- Al borrar un comentario, sus likes se eliminan por cascade.

## Esfuerzo estimado

Estimacion para una primera version sin Realtime ni notificaciones:

- Base de datos y Prisma: 0.5 dia.
- Backend: 1 dia.
- Frontend: 1 dia.
- QA funcional y ajuste de errores: 0.5 dia.

Total estimado: 2.5 a 3 dias de trabajo.

La estimacion puede subir si se decide agregar notificaciones, Realtime, analiticas, tests automatizados completos o migraciones con datos productivos de alto volumen.

## Decisiones que deben aprobar los lideres

1. Aprobar que el alcance inicial sea solo likes en comentarios, no en posts.
2. Aprobar que el contador se guarde en `comentario.like_count`.
3. Aprobar la creacion de la tabla `comentario_like`.
4. Aprobar que no se use Realtime en la primera version.
5. Aprobar que no se muestre el listado de usuarios que dieron like.
6. Aprobar que el comportamiento sea idempotente: tocar like varias veces no duplica registros.
7. Aprobar que solo miembros de la comunidad puedan ver y modificar likes en comentarios de esa comunidad.

## Criterio de aprobacion

El cambio se considera listo cuando:

- Los comentarios devuelven `like_count` y `viewer_has_liked`.
- Dar like y quitar like son operaciones idempotentes.
- La UI muestra contador y estado activo correctamente.
- No hay `COUNT(*)` por comentario en la carga normal.
- La base tiene indices para las consultas esperadas.
- El usuario no puede interactuar con comentarios fuera de sus comunidades.

## Recomendacion final

Recomiendo aprobar la implementacion con contador cacheado en `comentario.like_count` y tabla `comentario_like`.

No recomiendo implementar likes calculando el total en vivo cada vez que se cargan comentarios. Para Kreis, el enfoque con contador es mas simple, mas barato de operar y mas predecible para Supabase.
