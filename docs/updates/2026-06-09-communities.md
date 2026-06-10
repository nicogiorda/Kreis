# Registro de trabajo - 2026-06-09

Este documento resume los cambios implementados en la sesion del 9 de junio de 2026. Cubre el modulo de comunidades (backend), una correccion en el registro de usuarios y una ruta de dev para asignar roles.

---

## Resumen

- Se implemento el modulo de comunidades completo en el backend.
- Se corrigio un bug critico en el registro que impedia crear usuarios.
- Se agrego una ruta de desarrollo para asignar roles sin tocar la base de datos manualmente.

---

## Bug fix: registro de usuarios

### Problema

Al registrarse, la API devolvía:

```json
{
  "error": {
    "code": "profile_creation_failed",
    "message": "Transaction API error: Unable to start a transaction in the given time."
  }
}
```

### Causa

El archivo `apps/api/src/modules/auth/infrastructure/prisma-user-repository.ts` usaba `prisma.$transaction(async fn)` (transacción interactiva). Este tipo de transacción requiere una conexión persistente a la base de datos. Supabase usa PgBouncer en transaction mode, que libera la conexión entre queries y no puede garantizar la persistencia que requiere este API.

### Solución

Se reemplazó la transacción interactiva por un **nested write** de Prisma. Un nested write crea el usuario y sus tópicos en una sola operación atómica compatible con PgBouncer.

```typescript
// ANTES (roto con PgBouncer)
await prisma.$transaction(async (tx) => { ... });

// DESPUÉS (compatible)
await prisma.usuario.create({
  data: {
    ...datosUsuario,
    usuario_topico: {
      createMany: { data: topicos, skipDuplicates: true }
    }
  }
});
```

**Archivo modificado:** `apps/api/src/modules/auth/infrastructure/prisma-user-repository.ts`

---

## Modulo de comunidades

### Archivos creados

```
apps/api/src/modules/communities/
  data/
    communities-repository.ts   — queries a Prisma
  api/
    serialize-community.ts      — convierte el resultado de Prisma a JSON plano
    routes.ts                   — endpoints HTTP
```

### Archivos modificados

```
apps/api/src/modules/users/data/users-repository.ts  — nueva funcion updateUserRol
apps/api/src/modules/users/api/routes.ts             — nueva ruta dev PATCH /:legajo/rol
```

---

## Endpoints implementados

### Comunidades

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/v1/communities` | Opcional | Lista comunidades visibles |
| `POST` | `/api/v1/communities` | Requerida | Crea una comunidad |
| `GET` | `/api/v1/communities/admin` | Admin | Lista todas con cualquier estado |
| `PATCH` | `/api/v1/communities/admin/:id/status` | Admin | Cambia el estado de una comunidad |

### Dev

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `PATCH` | `/api/v1/users/:legajo/rol` | Ninguna | Asigna un rol (solo en desarrollo) |

---

## Detalle de cada endpoint

### GET /api/v1/communities

Devuelve comunidades visibles para el solicitante:

- **Sin token**: solo comunidades con `estado = Aceptado`.
- **Con token**: comunidades `Aceptado` de todos + las propias con `estado = Pendiente`.

El campo `joined` indica si el usuario autenticado es miembro de cada comunidad.

**Respuesta exitosa (200):**

```json
{
  "comunidades": [
    {
      "id": "1",
      "nombre": "Tecnología UADE",
      "descripcion": "Comunidad para estudiantes de sistemas",
      "estado": "Aceptado",
      "miembros": 5,
      "joined": true,
      "topicos": [
        { "id_topico": "2", "topico": "Tecnología" }
      ],
      "created_at": "2026-06-09T22:00:00.000Z"
    }
  ]
}
```

---

### POST /api/v1/communities

Crea una comunidad nueva. El legajo del creador se extrae del JWT — nunca se manda en el body.

La comunidad se crea con `estado = Pendiente`. El creador queda automáticamente como miembro.

**Headers requeridos:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body:**
```json
{
  "nombre": "Tecnología UADE",
  "descripcion": "Comunidad para estudiantes de sistemas",
  "topicos": [1, 2]
}
```

`descripcion` y `topicos` son opcionales.

**Respuesta exitosa (201):**
```json
{
  "comunidad": {
    "id": "1",
    "nombre": "Tecnología UADE",
    "descripcion": "Comunidad para estudiantes de sistemas",
    "estado": "Pendiente",
    "miembros": 1,
    "joined": true,
    "topicos": [
      { "id_topico": "1", "topico": "Tecnología" }
    ],
    "created_at": "2026-06-09T22:00:00.000Z"
  }
}
```

---

### GET /api/v1/communities/admin

Devuelve todas las comunidades sin filtrar por estado. Ordenadas: Pendiente primero, luego por nombre.

Requiere rol `Administrador`. Devuelve `403` si el usuario tiene otro rol.

**Headers requeridos:**
```
Authorization: Bearer <access_token>
```

**Respuesta exitosa (200):** mismo contrato que el GET público pero incluye comunidades en todos los estados.

---

### PATCH /api/v1/communities/admin/:id/status

Cambia el estado de una comunidad. Usado para aprobar o rechazar comunidades pendientes.

Requiere rol `Administrador`.

**Headers requeridos:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body:**
```json
{ "estado": "Aceptado" }
```

Valores válidos para `estado`: `Pendiente`, `Aceptado`, `Rechazado`.

**Respuesta exitosa (200):** la comunidad actualizada con el mismo contrato de los otros endpoints.

**Errores posibles:**
- `400` — estado inválido
- `403` — el usuario no tiene rol Administrador
- `404` — comunidad no encontrada

---

### PATCH /api/v1/users/:legajo/rol (solo dev)

Asigna un rol a un usuario. **Solo funciona cuando `NODE_ENV !== production`**. En producción devuelve `404`.

No requiere autenticación. Sirve únicamente para testear rutas protegidas por rol sin modificar la base de datos manualmente.

**Body:**
```json
{ "rol": "Administrador" }
```

Valores válidos: `Estudiante`, `Moderador`, `Administrador`.

**Respuesta exitosa (200):**
```json
{ "legajo": 1188227, "rol": "Administrador" }
```

---

## Flujo completo de comunidades

```
1. Cualquier usuario crea una comunidad
   POST /api/v1/communities
   → estado = Pendiente
   → no aparece en el GET público

2. El creador hace GET con su token
   GET /api/v1/communities
   → ve su comunidad con estado = Pendiente
   → nadie más la ve todavía

3. Un admin la aprueba
   PATCH /api/v1/communities/admin/:id/status
   body: { "estado": "Aceptado" }

4. Ahora aparece para todos
   GET /api/v1/communities
   → visible públicamente, joined = false para no miembros
```

---

## Guía de testing con Postman — paso a paso

### Paso 1 — Registrarse

```
POST http://localhost:4000/api/v1/auth/register
Content-Type: application/json
```

```json
{
  "email": "tuusuario@uade.edu.ar",
  "password": "tu_password",
  "legajo": 1234567,
  "nombre": "Tu Nombre",
  "apellido": "Tu Apellido",
  "id_facultad": 1,
  "topicos": [1, 2]
}
```

Guardar el `access_token` de la respuesta.

---

### Paso 2 — Login (si ya tenés cuenta)

```
POST http://localhost:4000/api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "tuusuario@uade.edu.ar",
  "password": "tu_password"
}
```



Copiar el valor de `session.access_token` de la respuesta (el string largo que empieza con `eyJ...`).

---

### Paso 3 — Ver comunidades sin token

```
GET http://localhost:4000/api/v1/communities
```

Sin Authorization header. Devuelve solo las comunidades `Aceptado`. Si la base está vacía, devuelve `{ "comunidades": [] }`.

---

### Paso 4 — Crear una comunidad

En Postman:
- Método: `POST`
- URL: `http://localhost:4000/api/v1/communities`
- Tab **Authorization** → Type: **Bearer Token** → pegar el `access_token`
- Tab **Body** → raw → JSON

```json
{
  "nombre": "Tecnología UADE",
  "descripcion": "Comunidad para estudiantes de sistemas",
  "topicos": [1]
}
```

La respuesta es `201` con la comunidad creada en estado `Pendiente`.

---

### Paso 5 — Ver la comunidad creada (con token)

```
GET http://localhost:4000/api/v1/communities
Authorization: Bearer <access_token>
```

Vas a ver tu comunidad con `"estado": "Pendiente"` y `"joined": true`. El resto de usuarios sin token no la ven todavía.

---

### Paso 6 — Asignarse rol Administrador

```
PATCH http://localhost:4000/api/v1/users/TU_LEGAJO/rol
Content-Type: application/json
```

```json
{ "rol": "Administrador" }
```

Sin token. Respuesta: `{ "legajo": 1234567, "rol": "Administrador" }`.

---

### Paso 7 — Ver todas las comunidades como admin

```
GET http://localhost:4000/api/v1/communities/admin
Authorization: Bearer <access_token>
```

Devuelve todas las comunidades sin importar el estado.

---

### Paso 8 — Aprobar la comunidad

Primero obtener el `id` de la comunidad de la respuesta del paso anterior.

```
PATCH http://localhost:4000/api/v1/communities/admin/ID_COMUNIDAD/status
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{ "estado": "Aceptado" }
```

---

### Paso 9 — Verificar que ahora es pública

```
GET http://localhost:4000/api/v1/communities
```

Sin token. Ahora la comunidad aparece en la lista pública con `"estado": "Aceptado"`.

---

## Lógica de roles

El campo `rol` del modelo `usuario` tiene tres valores posibles:

| Rol | Acceso |
|-----|--------|
| `Estudiante` | Endpoints públicos y autenticados estándar |
| `Moderador` | Reservado para uso futuro |
| `Administrador` | Rutas `/admin` de comunidades (y futuros módulos) |

El rol se asigna con la ruta de dev `PATCH /api/v1/users/:legajo/rol`. En producción esa ruta no existe.

---

## Notas para el equipo

- Las comunidades nuevas siempre empiezan en `Pendiente`. Esto es intencional — ningún usuario puede publicar contenido sin moderación.
- El campo `joined` en el GET sirve para que el frontend muestre el botón "Unirse" o "Ya soy miembro" sin un request extra.
- El creador de una comunidad queda como miembro automáticamente al crearla.
- `bigint` de Postgres se serializa como `string` en todas las respuestas JSON. El frontend debe tratar los campos `id`, `id_topico`, etc. como strings.
- La ruta `/communities/admin` debe ir **antes** que `/:id` en el router para que Express no interprete "admin" como un ID. Esto ya está implementado correctamente.

---

## Actualización 2026-06-10 — Membresías y posts persistentes

Esta continuación completa los objetivos de **unirse a una comunidad** y **postear en una comunidad**. También conecta el frontend con las APIs reales de comunidades y posts, reemplazando el comportamiento local basado en datos mock.

### Estado actualizado de objetivos

| Objetivo | Estado |
|----------|--------|
| Ver comunidades | Implementado en backend e integrado con frontend |
| Unirse a comunidad | Implementado en backend e integrado con frontend |
| Crear comunidad | Implementado en backend e integrado con frontend |
| Postear en una comunidad | Implementado en backend e integrado con frontend |
| Comentarios anidados | Implementado en backend e integrado con frontend |

---

### Endpoints nuevos de membresía

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/v1/communities/:id/members` | Requerida | Une al usuario autenticado a una comunidad |
| `DELETE` | `/api/v1/communities/:id/members` | Requerida | Quita al usuario autenticado de una comunidad |

Las dos operaciones:

- Obtienen el `legajo` desde el JWT.
- Solo permiten comunidades con `estado = Aceptado`.
- Son idempotentes: repetir la misma operación conserva el estado solicitado.
- Devuelven el estado final y la cantidad actualizada de miembros.
- Devuelven `404 community_not_found` si la comunidad no existe o no está aceptada.

#### Unirse a una comunidad

```http
POST http://localhost:4000/api/v1/communities/ID_COMUNIDAD/members
Authorization: Bearer <access_token>
```

**Respuesta exitosa (200):**

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

#### Salir de una comunidad

```http
DELETE http://localhost:4000/api/v1/communities/ID_COMUNIDAD/members
Authorization: Bearer <access_token>
```

**Respuesta exitosa (200):**

```json
{
  "membership": {
    "legajo": 1234567,
    "id_comunidad": "1",
    "joined": false,
    "miembros": 3
  }
}
```

---

### Endpoints nuevos de posts

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/v1/posts` | Requerida | Devuelve el feed de comunidades del usuario |
| `POST` | `/api/v1/posts` | Requerida | Crea un post dentro de una comunidad |

#### GET /api/v1/posts

Devuelve únicamente posts que cumplen estas reglas:

- La comunidad está en estado `Aceptado`.
- El usuario autenticado pertenece a la comunidad.
- Los resultados están ordenados desde el más reciente.

```http
GET http://localhost:4000/api/v1/posts
Authorization: Bearer <access_token>
```

**Respuesta exitosa (200):**

```json
{
  "posts": [
    {
      "id": "10",
      "cuerpo": "Busco equipo para preparar el parcial.",
      "created_at": "2026-06-10T18:00:00.000Z",
      "autor": {
        "legajo": 1234567,
        "nombre": "Nicolás",
        "apellido": "Pérez"
      },
      "comunidad": {
        "id": "1",
        "nombre": "Tecnología UADE"
      },
      "comentarios": 0
    }
  ]
}
```

#### POST /api/v1/posts

Para publicar, el usuario debe:

- Tener un token válido.
- Pertenecer a la comunidad.
- Publicar en una comunidad con estado `Aceptado`.
- Enviar un `cuerpo` no vacío de hasta 5000 caracteres.

```http
POST http://localhost:4000/api/v1/posts
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "id_comunidad": "1",
  "cuerpo": "Busco equipo para preparar el parcial."
}
```

**Respuesta exitosa (201):**

```json
{
  "post": {
    "id": "10",
    "cuerpo": "Busco equipo para preparar el parcial.",
    "created_at": "2026-06-10T18:00:00.000Z",
    "autor": {
      "legajo": 1234567,
      "nombre": "Nicolás",
      "apellido": "Pérez"
    },
    "comunidad": {
      "id": "1",
      "nombre": "Tecnología UADE"
    },
    "comentarios": 0
  }
}
```

**Errores posibles:**

- `400 validation_error` — ID o cuerpo inválido.
- `401 missing_token` / `invalid_token` — autenticación faltante o inválida.
- `403 not_community_member` — el usuario no pertenece a la comunidad.
- `404 community_not_found` — la comunidad no existe o no está aceptada.

---

### Integración realizada en el frontend

- Las comunidades se cargan desde `GET /api/v1/communities`.
- Los datos mock dejaron de ser la fuente de comunidades y actividad.
- El botón **Unirme** ejecuta el endpoint de membresía real.
- La interfaz actualiza la membresía y el contador de forma optimista.
- Si falla el request, la interfaz revierte al estado anterior.
- Las comunidades unidas de la pantalla de comunidades permiten salir al presionarlas.
- Al salir de una comunidad, sus posts desaparecen del feed local.
- Al unirse, el feed se vuelve a consultar.
- El composer solo muestra comunidades aceptadas donde el usuario es miembro.
- Crear un post espera el `201` real antes de incorporarlo al feed.
- Crear comunidad también quedó conectado al endpoint real existente.
- Las comunidades pendientes aparecen para su creador, pero no se pueden seleccionar para publicar.

---

### Archivos creados

```text
apps/api/src/modules/posts/
  data/
    posts-repository.ts
  api/
    serialize-post.ts

apps/web/src/api/
  communities.ts
  posts.ts
```

### Archivos modificados

```text
apps/api/src/modules/communities/
  README.md
  api/routes.ts
  data/communities-repository.ts

apps/api/src/modules/posts/
  README.md
  api/routes.ts

apps/web/src/
  app/App.tsx
  types.ts
  components/communities/CommunitiesScreen.tsx
  components/composer/ComposerModal.tsx
```

---

### Verificaciones realizadas

- Generación del cliente Prisma.
- Typecheck del backend.
- Typecheck del frontend.
- Build de producción del frontend.
- ESLint sobre todos los archivos modificados.
- Consulta real de lectura contra PostgreSQL/Supabase.
- Smoke test HTTP:
  - `/health` respondió `200`.
  - `/api/v1/posts` sin token respondió `401 missing_token`.
  - `/api/v1/communities/:id/members` sin token respondió `401 missing_token`.

Vitest finalizó correctamente, aunque el proyecto todavía no contiene archivos de pruebas automatizadas.

---

### Comentarios anidados implementados

La columna `comentario.id_padre` ya existía en Supabase como `bigint` nullable,
con una foreign key autorreferencial y `ON DELETE CASCADE`. Se sincronizó el
modelo Prisma y se completaron los índices que faltaban:

```text
comentario_id_post_id_padre_idx (id_post, id_padre)
comentario_id_padre_idx         (id_padre)
```

El primer índice optimiza la consulta plana de todos los comentarios de un post.
El segundo optimiza la relación autorreferencial y los borrados en cascada.

#### Endpoints de comentarios

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/v1/posts/:id/comentarios` | Requerida | Devuelve el árbol completo de comentarios |
| `POST` | `/api/v1/posts/:id/comentarios` | Requerida | Crea un comentario raíz o una respuesta |

Para leer o comentar:

- El post debe existir.
- La comunidad del post debe estar en estado `Aceptado`.
- El usuario autenticado debe ser miembro de la comunidad.
- El cuerpo debe tener entre 1 y 2000 caracteres.

Si se envía `id_padre`, el backend comprueba que:

- El comentario padre existe.
- El comentario padre pertenece al mismo post.

Si falla esta validación se devuelve `400 invalid_parent_comment`.

#### Crear comentario raíz en Postman

```http
POST http://localhost:4000/api/v1/posts/ID_POST/comentarios
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "cuerpo": "Este es un comentario principal."
}
```

#### Responder a un comentario

```http
POST http://localhost:4000/api/v1/posts/ID_POST/comentarios
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "cuerpo": "Esta es una respuesta anidada.",
  "id_padre": "5"
}
```

**Respuesta exitosa (201):**

```json
{
  "comentario": {
    "id": "6",
    "id_post": "1",
    "id_padre": "5",
    "cuerpo": "Esta es una respuesta anidada.",
    "created_at": "2026-06-10T19:00:00.000Z",
    "autor": {
      "legajo": 1234567,
      "nombre": "Nicolás",
      "apellido": "Pérez"
    },
    "respuestas": []
  },
  "total_comentarios": 2
}
```

#### Consultar el árbol

```http
GET http://localhost:4000/api/v1/posts/ID_POST/comentarios
Authorization: Bearer <access_token>
```

```json
{
  "comentarios": [
    {
      "id": "5",
      "id_post": "1",
      "id_padre": null,
      "cuerpo": "Este es un comentario principal.",
      "created_at": "2026-06-10T18:55:00.000Z",
      "autor": {
        "legajo": 1234567,
        "nombre": "Nicolás",
        "apellido": "Pérez"
      },
      "respuestas": [
        {
          "id": "6",
          "id_post": "1",
          "id_padre": "5",
          "cuerpo": "Esta es una respuesta anidada.",
          "created_at": "2026-06-10T19:00:00.000Z",
          "autor": {
            "legajo": 1234567,
            "nombre": "Nicolás",
            "apellido": "Pérez"
          },
          "respuestas": []
        }
      ]
    }
  ],
  "total_comentarios": 2
}
```

#### Construcción del árbol

- Prisma trae todos los comentarios del post en una única consulta plana.
- Los comentarios se ordenan por `created_at` e `id_comentario`.
- TypeScript crea un `Map` indexado por `id_comentario`.
- Los nodos con `id_padre = null` se agregan a la raíz.
- Las respuestas se agregan al arreglo `respuestas` de su padre.
- La API soporta profundidad ilimitada.

#### Integración frontend

- El contador de comentarios funciona como botón para abrir o cerrar el hilo.
- Los comentarios se cargan bajo demanda al abrir un post.
- Se pueden crear comentarios raíz.
- Se puede responder a cualquier comentario.
- El contador del post se actualiza con el total devuelto por la API.
- Los primeros cuatro niveles conservan jerarquía visual.
- A partir del cuarto nivel las respuestas aparecen colapsadas detrás de
  **Ver respuestas**, evitando que el contenido se vuelva demasiado angosto.
- Los errores de carga o publicación se muestran dentro del hilo.

#### Archivos agregados o modificados para comentarios

```text
prisma/schema.prisma
infra/database/migrations/20260610190000_add_nested_comment_indexes.sql

apps/api/src/modules/posts/
  data/posts-repository.ts
  api/routes.ts
  api/serialize-comment.ts

apps/web/src/
  api/posts.ts
  types.ts
  app/App.tsx
  components/communities/CommunitiesScreen.tsx
  components/communities/PostComments.tsx
```

#### Prueba de integración realizada

Se ejecutó una prueba real contra PostgreSQL/Supabase creando datos temporales:

1. Comentario raíz.
2. Respuesta de nivel 1.
3. Respuesta de nivel 2.
4. Intento de usar como padre un comentario perteneciente a otro post.
5. Lectura y construcción del árbol.

Resultados:

```json
{
  "root": "created",
  "reply": "created",
  "nested": "created",
  "invalidParent": "invalid_parent",
  "total": 3,
  "rootCount": 1,
  "levelOneCount": 1,
  "levelTwoCount": 1
}
```

Los posts y comentarios usados por la prueba fueron eliminados al finalizar.
