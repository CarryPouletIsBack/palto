begin;

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'app_account_role'
      and n.nspname = 'public'
  ) then
    create type public.app_account_role as enum ('client', 'chauffeur');
  end if;
end $$;

create table if not exists public.app_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role public.app_account_role not null,
  password_hash text not null,
  full_name text,
  phone text,
  vehicle_type text,
  delivery_equipped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_app_accounts_email_role on public.app_accounts (lower(email), role);

create table if not exists public.app_sessions (
  token text primary key,
  account_id uuid not null references public.app_accounts(id) on delete cascade,
  email text not null,
  role public.app_account_role not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_sessions_account_id on public.app_sessions(account_id);
create index if not exists idx_app_sessions_expires_at on public.app_sessions(expires_at);

alter table public.app_accounts enable row level security;
alter table public.app_sessions enable row level security;

drop policy if exists app_accounts_select_authenticated on public.app_accounts;
create policy app_accounts_select_authenticated
  on public.app_accounts
  for select
  to authenticated
  using (true);

drop policy if exists app_sessions_select_authenticated on public.app_sessions;
create policy app_sessions_select_authenticated
  on public.app_sessions
  for select
  to authenticated
  using (true);

commit;
