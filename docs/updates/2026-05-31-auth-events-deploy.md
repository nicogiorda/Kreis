# Registro de trabajo - 2026-05-31

Este documento resume los cambios implementados y las decisiones operativas tomadas el 31 de mayo de 2026. Sirve como punto de partida para continuar el desarrollo sin reconstruir el contexto de la sesion.

## Resumen

Durante la sesion se completo la primera integracion real entre frontend y backend para autenticacion y eventos.

- El frontend React/Vite se publica en Vercel.
- La API Express se publica en Render.
- Registro y login dejaron de ser ficticios.
- Los catalogos de topicos y facultades se consultan desde la API.
- Los eventos visibles dejaron de salir de `mockData.ts`.
- El listado, detalle, alta pendiente e interes de eventos se conectaron al backend.
- Se diagnostico y resolvio un bloqueo de deploy en Vercel Hobby.

URLs de produccion:

```text
Frontend: https://kreis-app.vercel.app
API:      https://kreis-api.onrender.com
```

## Arquitectura de deploy

El repositorio contiene dos aplicaciones con deploys separados:

```text
apps/web  -> Vercel
apps/api  -> Render
```

El frontend usa esta variable de entorno en Vercel:

```env
VITE_API_URL=https://kreis-api.onrender.com
```

La API permite requests del dominio publico mediante esta variable de entorno en Render:

```env
CORS_ORIGIN=https://kreis-app.vercel.app
```

La URL de CORS no debe incluir una barra final.

### Orden recomendado

Cuando un cambio modifica frontend y backend:

1. Hacer commit y push a `main`.
2. Publicar Render o esperar su auto-deploy.
3. Verificar la API en produccion.
4. Publicar Vercel.
5. Verificar `https://kreis-app.vercel.app`.

Publicar primero Render evita que el frontend nuevo dependa temporalmente de un contrato API que todavia no esta disponible.

## Registro y login

Commit principal:

```text
d439fd4 feat(auth): implement authentication flow with error handling and API integration
```

### Frontend

Archivo principal:

```text
apps/web/src/api/auth.ts
```

El frontend consume:

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/users/topicos
GET  /api/v1/users/facultades
```

El flujo de registro mantiene el borrador en memoria dentro de `AuthFlow`. Los datos se envian al backend recien al confirmar el paso final ficticio del certificado. El certificado de alumno regular todavia no se valida realmente.

Los topicos y las facultades ya no se definen como opciones locales:

- Los intereses se cargan desde `/api/v1/users/topicos`.
- Las facultades se cargan desde `/api/v1/users/facultades`.
- La facultad se elige mediante dropdown.
- El usuario ingresa tambien su legajo.

El login llama a la API y solo ingresa a la aplicacion si recibe una sesion valida. Las credenciales incorrectas muestran un error.

### Backend

El registro crea:

1. El usuario de autenticacion en Supabase.
2. El perfil de Kreis en la base de datos.
3. Las relaciones con los topicos elegidos.

Si falla la creacion del perfil, el caso de uso revierte el usuario creado en Supabase para evitar registros incompletos.

## Diagnostico del deploy de Vercel

Durante la sesion algunos deploys quedaban visualmente en `Building`, pero la inspeccion por CLI mostro:

```json
{
  "readyState": "BLOCKED"
}
```

El build local y el build interno de Vercel terminaban correctamente. El problema no era la compilacion.

El commit que disparaba el deploy estaba firmado por:

```text
Nicolas Umansky <umanskynico@gmail.com>
```

El proyecto privado pertenece al workspace Hobby de `ngiordano`. Para destrabar el deploy se genero un commit vacio firmado por el propietario:

```text
0527233 chore: trigger vercel deployment
```

Luego el deploy termino correctamente y el alias estable se reasigno a:

```text
https://kreis-app.vercel.app
```

Tambien se actualizo el remoto local del repositorio:

```text
origin https://github.com/nicogiorda/Kreis.git
```

### Regla operativa para Vercel Hobby

Mientras el repositorio privado se publique desde un workspace Hobby, el ultimo commit desplegado debe pertenecer al propietario autorizado por Vercel.

Si el ultimo commit lo hizo otro colaborador, el propietario puede crear un commit vacio:

```bash
git commit --allow-empty -m "chore: trigger vercel deployment"
git push origin main
```

Otra opcion es trabajar con ramas y hacer que el propietario integre los cambios antes de publicar. Un plan Vercel Pro permite agregar colaboradores autorizados al equipo.

## Eventos conectados al backend

Commit principal:

```text
44c5b41 feat(events): enhance event handling with interest toggling and improved serialization
```

### Listados y detalle

La API expone:

```http
GET /api/v1/events/accepted/summary/limit
GET /api/v1/events/accepted/summary/all
GET /api/v1/events/:id_evento
```

El backend:

- Devuelve solamente eventos con estado `Aceptado`.
- Ordena los eventos por `fecha_inicio`.
- Limita el listado de Inicio a seis resultados.
- Devuelve el detalle completo al abrir una card.
- Mantiene las imagenes como placeholders visuales.

El resumen de cada evento ahora incluye:

```json
{
  "id_evento": "4",
  "nombre": "Expo UADE",
  "ubicacion": "Microestadio",
  "fecha_inicio": "2026-06-23T12:00:00.000Z",
  "descripcion": "...",
  "topicos": [
    {
      "id_topico": "1",
      "topico": "Académico"
    }
  ],
  "interested": false
}
```

Los listados siguen siendo publicos. Si el frontend envia un JWT valido, la API informa si ese usuario esta anotado mediante `interested`.

### Adaptador del frontend

Archivo principal:

```text
apps/web/src/api/events.ts
```

El adaptador convierte el contrato API en el tipo visual `KreisEvent` que ya consumen las cards y el detalle. Esto permite conservar el diseno existente.

El frontend calcula:

- Dia, mes y hora con timezone `America/Argentina/Buenos_Aires`.
- Iniciales para cada evento.
- Categoria visual a partir del primer topico.
- Tono visual de la card.
- Badge oficial cuando algun topico normalizado es `academico`.

La normalizacion ignora tildes, por lo que funciona con el valor real `Académico` almacenado en la base de datos.

### Me interesa

La ruta autenticada es:

```http
POST /api/v1/events/:id_evento/interes
```

Antes, la ruta solo intentaba crear la relacion en `user_evento`. Si el usuario tocaba `Anotado`, la interfaz podia cambiar pero la base de datos conservaba la inscripcion.

Ahora funciona como toggle real:

```text
Si la relacion no existe -> crearla
Si la relacion ya existe -> eliminarla
```

La respuesta informa el estado final:

```json
{
  "interest": {
    "legajo": 123456,
    "id_evento": "4",
    "interested": true
  }
}
```

El frontend actualiza Inicio y Eventos de forma optimista. Si la API falla, restaura el estado anterior.

### Publicar evento

El modal envia:

```http
POST /api/v1/events
```

El backend crea el evento con estado `Pendiente`. No se agrega una card ficticia al frontend. El evento aparecera en los listados publicos recien cuando sea aceptado.

### Estados de interfaz

Inicio y Eventos ahora contemplan:

- Cargando eventos.
- Error de red.
- Reintentar.
- Sin resultados.

Esto evita que el tiempo de arranque de Render parezca una pantalla rota.

### Mock eliminado

`initialEvents` fue eliminado de:

```text
apps/web/src/data/mockData.ts
```

Comunidades y actividad todavia conservan datos mock. Eventos tienen una sola fuente de verdad: la API.

## Cliente HTTP compartido

Se creo:

```text
apps/web/src/api/client.ts
```

Centraliza:

- URL base de la API.
- Headers JSON.
- Header `Authorization: Bearer <token>`.
- Parseo de respuestas.
- Errores tipados mediante `ApiRequestError`.

`auth.ts` y `events.ts` usan este cliente para evitar duplicar logica HTTP.

## Verificaciones realizadas

Comandos ejecutados correctamente:

```bash
npm.cmd run typecheck:api
npm.cmd run typecheck:web
npm.cmd run lint
npm.cmd run build
npm.cmd run test
```

La suite de Vitest todavia no contiene archivos de test automatizados. El comando termina con codigo `0` gracias a `--passWithNoTests`.

Tambien se verifico:

- El listado limitado local devuelve seis eventos.
- El listado completo local devuelve ids, descripciones, topicos e `interested`.
- El detalle local devuelve creador, usuarios interesados e `interested`.
- Un JWT invalido recibe `401`.
- CORS local permite `http://localhost:5173`.
- CORS de produccion permite `https://kreis-app.vercel.app`.
- Render expone el contrato nuevo en produccion.
- Vercel sirve el bundle nuevo con la integracion de eventos.

## Estado al cerrar la sesion

Confirmado en produccion el 31 de mayo de 2026:

```text
Frontend: https://kreis-app.vercel.app
API:      https://kreis-api.onrender.com
```

Render responde `200` para:

```http
GET /api/v1/events/accepted/summary/all
```

El bundle publico de Vercel contiene:

```text
https://kreis-api.onrender.com
/api/v1/events/accepted/summary/all
/interes
```

## Pendientes recomendados

1. Probar manualmente `Me interesa` con una cuenta real desde produccion.
2. Agregar tests automatizados para auth, listado de eventos y toggle de interes.
3. Definir el flujo de moderacion para aceptar o rechazar eventos pendientes.
4. Conectar comunidades y actividad al backend cuando sus contratos esten listos.
5. Evaluar persistencia o refresh de sesion para no exigir login tras cada recarga.

## Referencias oficiales

- Vercel: https://vercel.com/docs/deployments/troubleshoot-project-collaboration
- Render: https://render.com/docs/deploys
