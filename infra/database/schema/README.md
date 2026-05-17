# Schema

Modelo conceptual inicial para Kreis.

## Entidades base

- `users`: identidad funcional del usuario.
- `profiles`: nombre, carrera, foto y datos visibles.
- `events`: eventos publicados.
- `event_interests`: relacion usuario-evento para interes/asistencia.
- `communities`: comunidades disponibles.
- `community_memberships`: relacion usuario-comunidad.
- `posts`: publicaciones dentro de comunidades.
- `comments`: comentarios en posts.
- `post_reactions`: reacciones o score por usuario.
- `notifications`: avisos generados para usuarios.

## Relaciones principales

```mermaid
erDiagram
  USERS ||--|| PROFILES : has
  USERS ||--o{ EVENT_INTERESTS : marks
  EVENTS ||--o{ EVENT_INTERESTS : receives
  USERS ||--o{ COMMUNITY_MEMBERSHIPS : joins
  COMMUNITIES ||--o{ COMMUNITY_MEMBERSHIPS : contains
  COMMUNITIES ||--o{ POSTS : hosts
  USERS ||--o{ POSTS : writes
  POSTS ||--o{ COMMENTS : has
  USERS ||--o{ COMMENTS : writes
  POSTS ||--o{ POST_REACTIONS : receives
  USERS ||--o{ NOTIFICATIONS : receives
```

Este documento es conceptual. Las decisiones finales de tipos, constraints e indices deben quedar en migraciones.
