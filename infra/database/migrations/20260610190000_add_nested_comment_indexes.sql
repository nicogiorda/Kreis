-- Modulo afectado: posts/comentarios.
-- La columna comentario.id_padre y su FK autorreferencial ya existian en Supabase.
-- Estos indices optimizan el listado por post y los joins/borrados por comentario padre.

CREATE INDEX IF NOT EXISTS comentario_id_post_id_padre_idx
  ON public.comentario (id_post, id_padre);

CREATE INDEX IF NOT EXISTS comentario_id_padre_idx
  ON public.comentario (id_padre);
