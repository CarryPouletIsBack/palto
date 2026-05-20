begin;

-- Position GPS des chauffeurs en ligne (heartbeat depuis le dashboard / navigation).
create table if not exists public.chauffeur_presence (
  account_id uuid primary key references public.app_accounts(id) on delete cascade,
  lng double precision not null,
  lat double precision not null,
  is_available boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists idx_chauffeur_presence_updated_at on public.chauffeur_presence (updated_at desc);
create index if not exists idx_chauffeur_presence_available on public.chauffeur_presence (is_available) where is_available = true;

alter table public.chauffeur_presence enable row level security;

drop policy if exists chauffeur_presence_select_authenticated on public.chauffeur_presence;
create policy chauffeur_presence_select_authenticated
  on public.chauffeur_presence
  for select
  to authenticated
  using (true);

commit;
