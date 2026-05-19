begin;

-- Profil passager + lieux favoris (sync multi-appareils, lié au compte app_accounts client).
create table if not exists public.client_profile_data (
  account_id uuid primary key references public.app_accounts(id) on delete cascade,
  account_snapshot jsonb not null default '{}'::jsonb,
  saved_places jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_profile_data_updated_at on public.client_profile_data(updated_at desc);

alter table public.client_profile_data enable row level security;

drop policy if exists client_profile_data_select_authenticated on public.client_profile_data;
create policy client_profile_data_select_authenticated
  on public.client_profile_data
  for select
  to authenticated
  using (true);

drop policy if exists client_profile_data_insert_authenticated on public.client_profile_data;
create policy client_profile_data_insert_authenticated
  on public.client_profile_data
  for insert
  to authenticated
  with check (true);

drop policy if exists client_profile_data_update_authenticated on public.client_profile_data;
create policy client_profile_data_update_authenticated
  on public.client_profile_data
  for update
  to authenticated
  using (true)
  with check (true);

commit;
