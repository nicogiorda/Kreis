-- Vincula cada validacion documental con la facultad detectada por el extractor.
-- Las filas previas pueden quedar nulas porque son credenciales temporales ya vencidas o por vencer.

alter table public.certificate_verification
  add column if not exists id_facultad bigint;

alter table public.certificate_verification
  drop constraint if exists fk_certificate_verification_facultad;

alter table public.certificate_verification
  add constraint fk_certificate_verification_facultad
  foreign key (id_facultad)
  references public.facultad(id_facultad)
  on delete restrict;

create index if not exists certificate_verification_id_facultad_idx
  on public.certificate_verification(id_facultad);