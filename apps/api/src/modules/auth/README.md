# Auth module

Responsabilidad: identidad, login, sesiones, permisos y proteccion de rutas.

Incluye:

- Verificacion temprana del correo universitario mediante OTP propio.
- Registro final con correo y certificado previamente verificados.
- Creacion confirmada en Supabase Auth mediante Admin API.
- Sesiones o tokens.
- Password reset o integracion con proveedor externo.
- Roles/permisos.

No incluye datos de perfil publico; eso vive en `users`.

Flujo de registro:

1. `POST /email-verification/start` envia el OTP.
2. `POST /email-verification/verify` entrega una credencial temporal opaca.
3. `POST /certificate/classify` valida esa credencial antes de usar Document AI.
4. `POST /register` reclama y consume las credenciales de correo y certificado.

Los OTP y tokens nunca se guardan en texto plano.
