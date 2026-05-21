-- Profil chauffeur (sync multi-appareils)
create table if not exists public.chauffeur_profile_data (
  account_id uuid primary key references public.app_accounts(id) on delete cascade,
  account_snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_chauffeur_profile_data_updated
  on public.chauffeur_profile_data (updated_at desc);

alter table public.chauffeur_profile_data enable row level security;
