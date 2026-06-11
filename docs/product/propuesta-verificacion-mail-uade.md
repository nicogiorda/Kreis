# Propuesta: verificacion de mail UADE con codigo

## Resumen ejecutivo

La propuesta es agregar una verificacion obligatoria por codigo enviado al mail universitario antes de permitir el ingreso completo a Kreis.

Hoy el flujo de registro crea el usuario y el perfil de la aplicacion, valida el certificado de alumno regular y luego inicia sesion automaticamente. El cambio propuesto agrega una capa adicional: despues de registrarse, el usuario recibe un codigo de 6 digitos en su mail UADE y debe ingresarlo en Kreis. Recien cuando el codigo es correcto, la cuenta queda marcada como verificada y el usuario puede entrar.

Objetivos principales:

- Confirmar que el usuario controla un mail institucional UADE.
- Evitar cuentas registradas con mails externos o mal escritos.
- Mantener el perfil creado, pero bloquear el acceso hasta que se valide el codigo.
- Dejar una base preparada para reenvio de codigos, expiracion, auditoria y soporte.

## Flujo propuesto

```text
Usuario completa registro
        |
        v
Frontend envia datos a POST /api/v1/auth/register
        |
        v
Backend valida dominio UADE
        |
        v
Backend crea usuario en Supabase Auth
        |
        v
Backend crea perfil en Kreis con verificado = false
        |
        v
Backend genera codigo, lo guarda hasheado y lo envia por mail
        |
        v
Frontend muestra pantalla "Ingresa el codigo"
        |
        v
Usuario ingresa codigo recibido
        |
        v
Frontend envia POST /api/v1/auth/verify-email
        |
        v
Backend valida codigo, expiracion e intentos
        |
        v
Backend marca usuario.verificado = true
        |
        v
Frontend inicia sesion o permite continuar
```

## Cambios en backend

### 1. Validacion del dominio UADE

En `apps/api/src/modules/auth/api/routes.ts`, el schema de registro deberia validar que el email pertenezca al dominio institucional permitido.

Ejemplo de regla:

```ts
email: z.string().email().refine(
  (email) => email.toLowerCase().endsWith("@uade.edu.ar"),
  "El mail debe ser institucional UADE."
)
```

Antes de implementarlo hay que confirmar el dominio real que usa UADE para estudiantes. Si hay mas de uno, conviene modelarlo con una lista:

```ts
const allowedUniversityEmailDomains = ["@uade.edu.ar"];
```

Esto evita hardcodear una unica regla dificil de cambiar.

### 2. Crear perfil como no verificado

Hoy `PrismaUserRepository.createProfile` crea el usuario con:

```ts
verificado: true
```

El cambio seria:

```ts
verificado: false
```

Archivo:

```text
apps/api/src/modules/auth/infrastructure/prisma-user-repository.ts
```

Con esto, el usuario puede existir en la base, pero Kreis todavia no lo considera habilitado para usar la app.

### 3. Nueva tabla para codigos de verificacion

Agregar una tabla dedicada a codigos de verificacion. No conviene guardar el codigo en texto plano; se debe guardar un hash.

Modelo Prisma propuesto:

```prisma
model email_verification_code {
  id          BigInt    @id @default(autoincrement())
  legajo      Int
  code_hash   String
  expires_at  DateTime  @db.Timestamptz(6)
  consumed_at DateTime? @db.Timestamptz(6)
  attempts    Int       @default(0)
  created_at  DateTime  @default(now()) @db.Timestamptz(6)

  usuario usuario @relation(fields: [legajo], references: [legajo], onDelete: Cascade)

  @@index([legajo, created_at])
  @@schema("public")
}
```

Tambien habria que agregar la relacion inversa en `usuario`:

```prisma
email_verification_code email_verification_code[]
```

Luego se deberia crear una migracion SQL/Prisma para produccion.

### 4. Servicio de generacion y hash del codigo

Agregar una pieza de dominio o application para generar y verificar codigos.

Reglas recomendadas:

- Codigo numerico de 6 digitos.
- Expiracion de 10 o 15 minutos.
- Maximo de 5 intentos por codigo.
- Invalidar codigos anteriores cuando se genera uno nuevo.
- Guardar `code_hash`, nunca el codigo plano.

Implementacion sugerida:

- Generar el codigo con `crypto.randomInt(100000, 1000000)`.
- Hashearlo con `crypto.createHash("sha256")` usando un secreto del servidor.
- Comparar hashes al verificar.

Variable de entorno sugerida:

```env
EMAIL_VERIFICATION_SECRET=...
```

### 5. Repositorio de verificacion

Crear una interfaz en `apps/api/src/modules/auth/domain/auth.types.ts` o un archivo especifico del modulo:

```ts
export interface IEmailVerificationRepository {
  createCode(input: {
    legajo: number;
    codeHash: string;
    expiresAt: Date;
  }): Promise<void>;

  findLatestActiveCode(legajo: number): Promise<EmailVerificationCode | null>;

  incrementAttempts(id: bigint): Promise<void>;

  consumeCode(id: bigint): Promise<void>;

  markUserAsVerified(legajo: number): Promise<void>;
}
```

Implementacion:

```text
apps/api/src/modules/auth/infrastructure/prisma-email-verification-repository.ts
```

Mantener esta separacion permite testear el caso de uso sin depender directamente de Prisma.

### 6. Servicio de envio de mail

Agregar un contrato:

```ts
export interface IEmailSender {
  sendVerificationCode(input: {
    to: string;
    code: string;
    expiresInMinutes: number;
  }): Promise<void>;
}
```

Implementaciones posibles:

- Resend.
- SendGrid.
- SMTP institucional.
- Supabase Auth email templates, si se decide delegar el envio ahi.

Para el proyecto, Resend o SMTP suelen ser las opciones mas simples. La implementacion deberia vivir en:

```text
apps/api/src/modules/auth/infrastructure/email-sender.ts
```

Variables de entorno sugeridas:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=...
EMAIL_FROM=Kreis <no-reply@kreis.app>
EMAIL_VERIFICATION_SECRET=...
EMAIL_VERIFICATION_EXPIRATION_MINUTES=15
```

En desarrollo, se puede usar un sender de consola que imprima el codigo en logs para no depender de un proveedor externo.

### 7. Modificar el caso de uso de registro

Archivo actual:

```text
apps/api/src/modules/auth/application/register.ts
```

El caso de uso deberia pasar de:

```text
crear auth user
crear perfil
devolver usuario
```

a:

```text
crear auth user
crear perfil no verificado
generar codigo
guardar hash del codigo
enviar mail
devolver estado pending_verification
```

Respuesta sugerida de `POST /api/v1/auth/register`:

```json
{
  "status": "pending_verification",
  "email": "alumno@uade.edu.ar",
  "expires_in_minutes": 15
}
```

No deberia devolver sesion ni permitir login automatico en este punto.

### 8. Nuevo endpoint para verificar codigo

Agregar endpoint:

```http
POST /api/v1/auth/verify-email
```

Body:

```json
{
  "email": "alumno@uade.edu.ar",
  "code": "123456"
}
```

Validaciones:

- Email valido.
- Codigo numerico de 6 digitos.
- Usuario existente.
- Perfil asociado existente.
- Codigo no consumido.
- Codigo no expirado.
- Intentos menores al maximo permitido.
- Hash coincidente.

Respuesta exitosa:

```json
{
  "status": "verified"
}
```

Errores esperados:

```json
{
  "error": {
    "code": "invalid_verification_code",
    "message": "El codigo ingresado no es correcto."
  }
}
```

Otros codigos posibles:

- `verification_code_expired`
- `verification_code_attempts_exceeded`
- `user_not_found`
- `already_verified`
- `validation_error`

### 9. Endpoint para reenviar codigo

Agregar endpoint:

```http
POST /api/v1/auth/resend-verification-code
```

Body:

```json
{
  "email": "alumno@uade.edu.ar"
}
```

Reglas:

- Solo reenviar si el usuario existe y no esta verificado.
- Generar un codigo nuevo.
- Invalidar codigos anteriores no consumidos.
- Aplicar rate limit para evitar abuso.

Respuesta:

```json
{
  "status": "sent",
  "expires_in_minutes": 15
}
```

### 10. Bloquear login si el usuario no esta verificado

Archivo actual:

```text
apps/api/src/modules/auth/application/login.ts
```

Hoy el login delega directamente a Supabase. El cambio propuesto:

1. Autenticar contra Supabase.
2. Buscar el perfil de Kreis asociado al `auth_id`.
3. Si `usuario.verificado` es `false`, devolver error.
4. Si esta verificado, devolver la sesion normalmente.

Error sugerido:

```json
{
  "error": {
    "code": "email_not_verified",
    "message": "Tenes que validar el codigo enviado a tu mail UADE."
  }
}
```

Esto evita que alguien registre una cuenta y entre sin completar la verificacion.

### 11. Manejo de rollback

Actualmente el registro elimina el usuario de Supabase si falla la creacion del perfil. Ese comportamiento deberia mantenerse.

Ademas:

- Si falla guardar el codigo, se deberia eliminar el usuario de Supabase o dejar el registro en estado recuperable.
- Si falla enviar el mail, hay dos opciones:
  - Estricta: fallar el registro y hacer rollback.
  - Flexible: dejar la cuenta creada como no verificada y permitir reenviar codigo.

Recomendacion: usar la opcion flexible. Si el proveedor de mail falla, el usuario puede intentar reenviar desde la pantalla de verificacion. Es mejor que no perder el registro completo por una falla temporal del proveedor.

### 12. Tests backend

Agregar tests para:

- Registro rechaza email no UADE.
- Registro crea `usuario.verificado = false`.
- Registro genera codigo y llama al sender.
- Verificacion exitosa marca al usuario como verificado.
- Codigo incorrecto incrementa intentos.
- Codigo expirado no verifica.
- Codigo consumido no se puede reutilizar.
- Login de usuario no verificado devuelve `email_not_verified`.
- Login de usuario verificado funciona.

## Cambios en frontend

### 1. Cambiar el flujo despues del registro

Archivo principal:

```text
apps/web/src/components/auth/AuthFlow.tsx
```

Hoy, despues de validar el certificado, el frontend hace:

```text
register()
login()
setStep("validated")
```

La propuesta es cambiarlo a:

```text
register()
setStep("emailVerification")
```

Recien despues de verificar el codigo:

```text
verifyEmailCode()
login()
setStep("validated")
```

### 2. Nuevo paso visual: ingreso de codigo

Agregar un nuevo `AuthStep`:

```ts
type AuthStep =
  | "welcome"
  | "login"
  | "university"
  | "interests"
  | "profile"
  | "password"
  | "certificate"
  | "emailVerification"
  | "validated";
```

Crear un componente:

```text
EmailVerificationScreen
```

Contenido esperado:

- Titulo: "Revisa tu mail"
- Texto breve: "Te enviamos un codigo a tu mail UADE."
- Input para codigo de 6 digitos.
- Boton "Verificar".
- Boton secundario "Reenviar codigo".
- Estado de carga.
- Mensaje de error.

### 3. Nuevas funciones de API frontend

Archivo:

```text
apps/web/src/api/auth.ts
```

Agregar:

```ts
export async function verifyEmailCode(email: string, code: string): Promise<void> {
  await requestJson("/api/v1/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ email, code })
  });
}
```

Y:

```ts
export async function resendVerificationCode(email: string): Promise<void> {
  await requestJson("/api/v1/auth/resend-verification-code", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}
```

### 4. Manejo de errores en UI

Actualizar `getAuthErrorMessage` para contemplar:

- `email_not_verified`
- `invalid_verification_code`
- `verification_code_expired`
- `verification_code_attempts_exceeded`
- `resend_too_soon`

Mensajes sugeridos:

```text
invalid_verification_code: "El codigo no coincide. Revisalo e intenta de nuevo."
verification_code_expired: "El codigo vencio. Pedi uno nuevo para continuar."
verification_code_attempts_exceeded: "Se agotaron los intentos. Pedi un codigo nuevo."
email_not_verified: "Antes de entrar tenes que validar tu mail UADE."
resend_too_soon: "Espera unos segundos antes de pedir otro codigo."
```

### 5. Login de usuarios pendientes

Si un usuario intenta iniciar sesion pero aun no verifico su mail, el backend va a responder `email_not_verified`.

El frontend deberia:

- Mostrar un mensaje claro.
- Ofrecer reenviar el codigo.
- Llevarlo a la pantalla de verificacion usando el email ingresado.

Esto evita que el usuario quede bloqueado sin saber que hacer.

### 6. Persistencia temporal del estado

El codigo no debe guardarse, pero si conviene guardar temporalmente el email pendiente en memoria. Opcionalmente se puede usar `sessionStorage` para que, si el usuario recarga la pagina, vuelva a la pantalla de verificacion.

Ejemplo:

```text
kreis.pendingVerificationEmail
```

No guardar password ni codigo en storage.

## Otros cambios necesarios

### 1. Variables de entorno

Actualizar documentacion y configuracion de deploy para incluir:

```env
EMAIL_PROVIDER=...
EMAIL_FROM=...
EMAIL_VERIFICATION_SECRET=...
EMAIL_VERIFICATION_EXPIRATION_MINUTES=15
RESEND_API_KEY=...
```

Si se usa SMTP:

```env
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASSWORD=...
```

### 2. Migracion de base de datos

Crear migracion para:

- Nueva tabla `email_verification_code`.
- Relacion con `usuario`.
- Indices por `legajo` y `created_at`.

Tambien revisar si ya hay usuarios existentes con `verificado = true`. Para datos actuales, probablemente conviene dejarlos como estan y aplicar el flujo solo a registros nuevos.

### 3. Rate limiting

Agregar limite para:

- Reenvio de codigo.
- Intentos de verificacion.
- Registro con el mismo email.

Reglas recomendadas:

- Reenviar codigo maximo 1 vez cada 60 segundos.
- Maximo 5 intentos por codigo.
- Maximo 5 codigos por email por hora.

Esto protege el proveedor de email y evita abuso del endpoint.

### 4. Observabilidad y soporte

Agregar logs internos para:

- Codigo generado y mail enviado en desarrollo.
- Fallo de proveedor de email.
- Codigo expirado.
- Intentos excedidos.
- Usuario verificado exitosamente.

En produccion no se debe loguear el codigo en texto plano.

### 5. Copy y producto

Definir textos finales:

- Asunto del mail.
- Cuerpo del mail.
- Mensajes de error.
- Texto en la pantalla de verificacion.

Ejemplo de mail:

```text
Asunto: Tu codigo de verificacion de Kreis

Hola,

Tu codigo para verificar tu mail UADE en Kreis es:

123456

Este codigo vence en 15 minutos. Si no pediste crear una cuenta en Kreis, podes ignorar este mensaje.
```

### 6. Seguridad

Recomendaciones:

- No guardar codigos en texto plano.
- No devolver si un email existe o no en endpoints publicos de reenvio, para evitar enumeracion.
- Usar expiracion corta.
- Invalidar codigos usados.
- Bloquear por intentos.
- No guardar password ni codigo en frontend.
- Usar HTTPS en produccion.
- Proteger variables de entorno en Render/Vercel.

### 7. Compatibilidad con Supabase

Hay dos caminos posibles:

1. Mantener verificacion propia de Kreis.
2. Usar verificacion nativa de Supabase Auth.

Recomendacion para este caso: mantener verificacion propia de Kreis, porque el producto pide un codigo dentro de la experiencia de Kreis y ya existe el campo `usuario.verificado`. Supabase puede seguir manejando identidad y sesiones, mientras Kreis maneja la regla de negocio universitaria.

## Contratos API propuestos

### Registro

```http
POST /api/v1/auth/register
```

Request:

```json
{
  "email": "alumno@uade.edu.ar",
  "password": "password123",
  "legajo": 123456,
  "nombre": "Santiago",
  "apellido": "Gimenez",
  "id_facultad": 1,
  "topicos": [1, 2, 3]
}
```

Response:

```json
{
  "status": "pending_verification",
  "email": "alumno@uade.edu.ar",
  "expires_in_minutes": 15
}
```

### Verificar codigo

```http
POST /api/v1/auth/verify-email
```

Request:

```json
{
  "email": "alumno@uade.edu.ar",
  "code": "123456"
}
```

Response:

```json
{
  "status": "verified"
}
```

### Reenviar codigo

```http
POST /api/v1/auth/resend-verification-code
```

Request:

```json
{
  "email": "alumno@uade.edu.ar"
}
```

Response:

```json
{
  "status": "sent",
  "expires_in_minutes": 15
}
```

### Login no verificado

```http
POST /api/v1/auth/login
```

Response:

```json
{
  "error": {
    "code": "email_not_verified",
    "message": "Tenes que validar el codigo enviado a tu mail UADE."
  }
}
```

## Plan de implementacion sugerido

### Fase 1: Base backend

- Agregar modelo Prisma y migracion.
- Agregar repositorio de codigos.
- Agregar generacion/hash de codigos.
- Cambiar registro para crear usuario no verificado.
- Agregar endpoint `verify-email`.
- Bloquear login si `verificado = false`.

### Fase 2: Email real

- Elegir proveedor de email.
- Implementar `IEmailSender`.
- Agregar variables de entorno.
- Probar envio en desarrollo y produccion.
- Agregar fallback de logs solo para desarrollo.

### Fase 3: Frontend

- Agregar pantalla de codigo.
- Cambiar flujo de signup.
- Agregar llamadas `verifyEmailCode` y `resendVerificationCode`.
- Manejar errores nuevos.
- Manejar login de usuario pendiente.

### Fase 4: Seguridad y pulido

- Rate limiting.
- Tests backend.
- QA manual en ambiente de staging o desarrollo.
- Revisar textos finales.
- Revisar metricas/logs.

## Criterios de aceptacion

La funcionalidad se considera lista cuando:

- No se puede registrar un usuario con mail fuera del dominio UADE permitido.
- Un usuario nuevo queda con `verificado = false`.
- El usuario recibe un codigo por email.
- El codigo vence despues del tiempo configurado.
- Un codigo incorrecto no verifica la cuenta.
- Un codigo correcto marca `usuario.verificado = true`.
- El login falla para usuarios no verificados.
- El login funciona para usuarios verificados.
- El usuario puede pedir reenvio de codigo.
- Los codigos usados no se pueden reutilizar.
- No se guarda el codigo en texto plano en la base.
- El frontend no hace login automatico antes de verificar el mail.

## Riesgos y decisiones pendientes

- Confirmar dominio real de mail UADE para estudiantes.
- Elegir proveedor de email.
- Definir si el registro falla cuando el mail no se puede enviar o si queda pendiente con opcion de reenvio.
- Definir si usuarios existentes mantienen `verificado = true`.
- Definir textos finales de mail y pantalla.
- Definir limites exactos de reenvio e intentos.

## Recomendacion final

Implementaria la verificacion como una regla propia de Kreis, no como reemplazo del login de Supabase. Supabase seguiria encargado de crear usuarios y emitir sesiones, mientras Kreis decide si esa cuenta puede entrar segun `usuario.verificado`.

Esta separacion encaja con la arquitectura actual del proyecto: `auth/application` contiene los casos de uso, `auth/infrastructure` contiene Prisma/Supabase/email, y `auth/api` expone los endpoints HTTP.
