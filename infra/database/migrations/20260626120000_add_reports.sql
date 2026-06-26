-- Reportes de moderacion para posts y comentarios.
-- Si ya se habia creado el borrador anterior en ingles, se elimina porque la feature aun no tenia datos productivos.
drop table if exists public.reporte cascade;
drop table if exists public.reports cascade;
drop type if exists public.reporte_tipo_objetivo cascade;
drop type if exists public.report_status cascade;
drop type if exists public.report_target_type cascade;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'reporte_tipo_reporte') then
    create type public.reporte_tipo_reporte as enum ('Post', 'Comentario');
  end if;

  if not exists (select 1 from pg_type where typname = 'reporte_estado') then
    create type public.reporte_estado as enum ('Pendiente', 'Desestimado', 'Resuelto');
  end if;
end $$;

create table if not exists public.reporte (
  id_reporte bigint generated always as identity primary key,
  tipo_reporte public.reporte_tipo_reporte not null,
  id_post bigint,
  id_comentario bigint,
  legajo_reportante int not null,
  motivo text not null,
  estado public.reporte_estado not null default 'Pendiente',
  contenido_reportado text,
  autor_legajo int,
  id_comunidad bigint,
  created_at timestamptz not null default now(),
  resuelto_at timestamptz,
  resuelto_por int,

  constraint reporte_tipo_reporte_check check (
    (tipo_reporte = 'Post' and id_comentario is null)
    or
    (tipo_reporte = 'Comentario' and id_post is null)
  ),
  constraint fk_reporte_post foreign key (id_post)
    references public.post(id_post) on delete set null,
  constraint fk_reporte_comentario foreign key (id_comentario)
    references public.comentario(id_comentario) on delete set null,
  constraint fk_reporte_reportante foreign key (legajo_reportante)
    references public.usuario(legajo) on delete cascade,
  constraint fk_reporte_moderador foreign key (resuelto_por)
    references public.usuario(legajo) on delete set null
);

create unique index if not exists reporte_unique_post_reportante
  on public.reporte(id_post, legajo_reportante)
  where tipo_reporte = 'Post' and id_post is not null;

create unique index if not exists reporte_unique_comentario_reportante
  on public.reporte(id_comentario, legajo_reportante)
  where tipo_reporte = 'Comentario' and id_comentario is not null;

create index if not exists reporte_estado_created_at_idx
  on public.reporte(estado, created_at desc);

create index if not exists reporte_tipo_reporte_idx
  on public.reporte(tipo_reporte);

create index if not exists reporte_id_post_idx
  on public.reporte(id_post);

create index if not exists reporte_id_comentario_idx
  on public.reporte(id_comentario);
