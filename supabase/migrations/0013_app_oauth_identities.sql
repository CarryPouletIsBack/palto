begin;

-- Comptes créés uniquement via Google/Facebook : pas de mot de passe local.
alter table public.app_accounts
  alter column password_hash drop not null;

create table if not exists public.app_oauth_identities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.app_accounts(id) on delete cascade,
  provider text not null check (provider in ('google', 'facebook')),
  provider_user_id text not null,
  provider_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Même identité OAuth peut lier client ET chauffeur (account_id distincts).
create unique index if not exists idx_app_oauth_provider_user_account
  on public.app_oauth_identities (provider, provider_user_id, account_id);

create index if not exists idx_app_oauth_account_id
  on public.app_oauth_identities (account_id);

alter table public.app_oauth_identities enable row level security;

commit;
