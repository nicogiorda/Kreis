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
