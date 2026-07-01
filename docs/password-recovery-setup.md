# Recuperacion de contrasena

Kreis usa Supabase Auth como unica fuente de verdad. La recuperacion se realiza
con un codigo OTP de seis digitos para que el flujo funcione al cambiar entre la
PWA instalada y la aplicacion de correo en iPhone.

## Configuracion obligatoria en Supabase

En el dashboard del proyecto:

1. Abrir `Authentication`.
2. Abrir `Email Templates`.
3. Seleccionar `Reset Password`.
4. Reemplazar el enlace principal por una plantilla que muestre
   `{{ .Token }}`.

Contenido sugerido:

```html
<p>Recibimos una solicitud para cambiar tu contrasena de Kreis.</p>

<p>Tu codigo de recuperacion es:</p>

<h1>{{ .Token }}</h1>

<p>Este codigo vence despues de un tiempo y solo puede utilizarse una vez.</p>

<p>Si no solicitaste este cambio, ignora este correo.</p>
```

No usar `{{ .ConfirmationURL }}` como metodo principal. Kreis solicita el
codigo con `resetPasswordForEmail()` y lo verifica en la PWA con
`verifyOtp({ email, token, type: "recovery" })`.

## SMTP de produccion

El servicio de correo predeterminado de Supabase sirve solamente para pruebas.
Antes de publicar:

1. Elegir un proveedor SMTP transaccional.
2. Configurarlo desde `Project Settings > Authentication > SMTP Settings`.
3. Usar como nombre de remitente `Kreis`.
4. Usar una direccion dedicada, por ejemplo
   `no-reply@auth.kreis.com.ar`.
5. Configurar en el DNS del dominio los registros SPF y DKIM entregados por el
   proveedor.
6. Publicar una politica DMARC y revisar sus reportes.

Nunca guardar las credenciales SMTP en este repositorio.

## Cambio de contrasena desde el perfil

La version instalada de `@supabase/supabase-js` acepta el atributo
`current_password`. Kreis lo envia junto con la contrasena nueva y no reenvia
ninguno de esos valores a su API.

Verificar en la configuracion del proveedor Email de Supabase que la
verificacion de la contrasena actual para cambios de contrasena este habilitada.
La interfaz de Kreis depende de esa validacion de Supabase y no intenta
reautenticar manualmente al usuario.

Checklist:

- [ ] SMTP configurado.
- [ ] SPF configurado.
- [ ] DKIM configurado.
- [ ] DMARC configurado.
- [ ] La plantilla Reset Password usa `{{ .Token }}`.
- [ ] Correo probado en Gmail.
- [ ] Correo probado en Outlook.
- [ ] Entrega revisada en spam.
- [ ] Prueba real desde una PWA instalada en iPhone.

## Prueba manual en iPhone

1. Instalar Kreis como PWA.
2. Abrirla desde el icono de inicio.
3. Entrar en `Iniciar sesion`.
4. Tocar `¿Olvidaste tu contrasena?`.
5. Solicitar el codigo.
6. Abrir Mail, Gmail u Outlook.
7. Copiar el codigo.
8. Volver manualmente a la PWA.
9. Pegar el codigo.
10. Confirmar que nunca aparece la home.
11. Crear una contrasena nueva.
12. Confirmar que la sesion actual sigue abierta.
13. Confirmar que una sesion anterior queda cerrada.
14. Repetir el flujo cerrando la PWA despues de validar el codigo.
15. Reabrirla y confirmar que continua en la pantalla de nueva contrasena.

Repetir tambien desde Safari normal y probar:

- Codigo incorrecto.
- Codigo vencido.
- Codigo ya utilizado.
- Reenvio despues de 60 segundos.
- Dispositivo sin conexion.
- Cierre voluntario de la recuperacion.
