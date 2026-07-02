# Verificacion de correo en Supabase

Kreis usa el OTP nativo de Supabase Auth para confirmar la propiedad del correo
despues de validar el certificado academico.

## Configuracion manual

1. En Supabase, abrir **Authentication > Providers > Email**.
2. Activar **Confirm email**.
3. Abrir **Authentication > Email Templates > Confirm signup**.
4. Usar `{{ .Token }}` en el contenido del mensaje en lugar de
   `{{ .ConfirmationURL }}`.
5. Mantener Resend configurado como **Custom SMTP** de Supabase.
6. Confirmar que la longitud del OTP coincide con
   `SUPABASE_EMAIL_OTP_LENGTH` en
   `apps/web/src/auth/email-otp.ts`.
7. Probar el flujo con un correo nuevo.

No se requieren secretos adicionales en el frontend ni una tabla propia de
codigos.

## Cuentas existentes

Las cuentas creadas antes de este cambio ya tienen `email_confirmed_at` porque
el backend utilizaba `email_confirm=true`. No se modifican automaticamente.
Para validar el flujo completo hay que usar un correo nuevo o eliminar
manualmente una cuenta de prueba y volver a registrarla.
