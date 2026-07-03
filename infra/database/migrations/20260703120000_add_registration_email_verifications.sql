-- Credenciales temporales para verificar el correo antes de crear la cuenta.
-- No contiene codigos ni tokens en texto plano.

create table if not exists public.registration_email_verification (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  verification_token_hash text,
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  verified_at timestamptz,
  claimed_at timestamptz,
  consumed_at timestamptz
);

create index if not exists registration_email_verification_email_idx
  on public.registration_email_verification(email);

create index if not exists registration_email_verification_expires_at_idx
  on public.registration_email_verification(expires_at);

create unique index if not exists registration_email_verification_token_hash_key
  on public.registration_email_verification(verification_token_hash)
  where verification_token_hash is not null;

alter table public.registration_email_verification enable row level security;

revoke all privileges on table public.registration_email_verification
  from anon, authenticated;
