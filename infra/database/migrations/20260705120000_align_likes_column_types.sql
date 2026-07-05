-- La tabla public.likes ya existia con id_post/id_comentario como integer,
-- pero post.id_post y comentario.id_comentario son bigint. El FK funcionaba
-- (Postgres permite comparar int4 con int8) pero corre riesgo de overflow
-- si algun id supera ~2.1 mil millones. Se alinean los tipos para que
-- coincidan exactamente con las columnas referenciadas.
-- Modulo backend afectado: posts.
alter table public.likes
  alter column id_post type bigint,
  alter column id_comentario type bigint;
