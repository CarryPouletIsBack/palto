-- Booking kind + matching (instant = client choisit chauffeur ; scheduled = chauffeurs se portent candidats)
-- Coordonnées optionnelles pour traçage / navigation.

begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'booking_kind'
      and n.nspname = 'public'
  ) then
    create type public.booking_kind as enum ('instant', 'scheduled');
  end if;
end $$;

alter table public.courses
  add column if not exists booking_kind public.booking_kind not null default 'instant';

alter table public.courses
  add column if not exists requested_driver_external_key text;

alter table public.courses
  add column if not exists assigned_driver_external_key text;

alter table public.courses
  add column if not exists pickup_lng double precision;

alter table public.courses
  add column if not exists pickup_lat double precision;

alter table public.courses
  add column if not exists dropoff_lng double precision;

alter table public.courses
  add column if not exists dropoff_lat double precision;

comment on column public.courses.booking_kind is 'instant: client impose requested_driver_external_key. scheduled: premier chauffeur (assigned_driver_external_key) qui accepte.';
comment on column public.courses.requested_driver_external_key is 'Cle mock / futur profil chauffeur (ex. d1) pour commande instantanee.';
comment on column public.courses.assigned_driver_external_key is 'Chauffeur qui a accepte / realise la course (cle alignee env VITE_CHAUFFEUR_DRIVER_EXTERNAL_KEY).';

create index if not exists idx_courses_booking_kind_status on public.courses (booking_kind, status);
create index if not exists idx_courses_requested_driver on public.courses (requested_driver_external_key)
  where requested_driver_external_key is not null;

commit;
