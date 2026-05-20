-- Préférences course affichées sur la page Go (par compte chauffeur).
alter table public.app_accounts
  add column if not exists pet_friendly boolean not null default true,
  add column if not exists luggage_assistance boolean not null default true,
  add column if not exists insulated_bag boolean not null default false;

update public.app_accounts
set insulated_bag = true
where role = 'chauffeur'
  and delivery_equipped = true
  and insulated_bag = false;
