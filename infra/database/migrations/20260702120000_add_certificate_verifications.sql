-- Credenciales efimeras que vinculan la validacion documental con el registro.
-- Modulo afectado: auth. No requiere backfill.

create table if not exists public.certificate_verification (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  email text not null,
  legajo integer not null,
  nombre_normalizado text not null,
  apellido_normalizado text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  consumed_at timestamptz
);

create index if not exists certificate_verification_expires_at_idx
  on public.certificate_verification(expires_at);
