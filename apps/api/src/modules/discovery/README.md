# Discovery module

Responsabilidad: vistas compuestas de home, busqueda y recomendaciones.

Incluye:

- Home feed.
- Busqueda global.
- Comunidades recomendadas.
- Eventos destacados o proximos.

Este modulo puede leer de varios dominios mediante interfaces o read models, pero no deberia escribir reglas de negocio que pertenezcan a `events`, `communities` o `posts`.
