# Backend source

`src` agrupa el codigo runtime del backend. Mantenerlo separado del frontend actual (`/src` en la raiz) evita mezclas mientras el proyecto evoluciona.

```text
core/       Piezas transversales del backend
platform/   Entrada HTTP, middlewares, jobs y wiring
shared/     Helpers internos sin dominio propio
modules/    Modulos de producto
```
