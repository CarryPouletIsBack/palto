-- Core schema for Palto Chauffeur dashboard
-- Tables: clients, courses, course_events
-- Notes:
-- - Uses public schema for simplicity.
-- - RLS is enabled on every table.
-- - Policies are currently broad for authenticated users and should be
--   tightened when user/driver ownership is wired.

begin;

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'course_status'
      and n.nspname = 'public'
  ) then
    create type public.course_status as enum (
      'pending',
      'accepted',
      'in_progress',
      'completed',
      'cancelled'
    );
  end if;
end $$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  rating numeric(2,1),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_rating_range check (
    rating is null or (rating >= 0 and rating <= 5)
  )
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  external_code text unique,
  client_id uuid references public.clients(id) on delete set null,
  scheduled_date date not null,
  scheduled_time time not null,
  pickup_address text not null,
  dropoff_address text not null,
  status public.course_status not null default 'pending',
  amount_eur numeric(10,2) not null default 0,
  distance_km numeric(8,2),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_amount_non_negative check (amount_eur >= 0),
  constraint courses_distance_non_negative check (distance_km is null or distance_km >= 0)
);

create table if not exists public.course_events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  event_type text not null,
  event_note text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_clients_phone on public.clients(phone);
create index if not exists idx_courses_scheduled_date_time on public.courses(scheduled_date, scheduled_time);
create index if not exists idx_courses_status on public.courses(status);
create index if not exists idx_courses_client_id on public.courses(client_id);
create index if not exists idx_course_events_course_id_created_at on public.course_events(course_id, created_at desc);

alter table public.clients enable row level security;
alter table public.courses enable row level security;
alter table public.course_events enable row level security;

drop policy if exists clients_select_authenticated on public.clients;
create policy clients_select_authenticated
  on public.clients
  for select
  to authenticated
  using (true);

drop policy if exists clients_insert_authenticated on public.clients;
create policy clients_insert_authenticated
  on public.clients
  for insert
  to authenticated
  with check (true);

drop policy if exists clients_update_authenticated on public.clients;
create policy clients_update_authenticated
  on public.clients
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists clients_delete_authenticated on public.clients;
create policy clients_delete_authenticated
  on public.clients
  for delete
  to authenticated
  using (true);

drop policy if exists courses_select_authenticated on public.courses;
create policy courses_select_authenticated
  on public.courses
  for select
  to authenticated
  using (true);

drop policy if exists courses_insert_authenticated on public.courses;
create policy courses_insert_authenticated
  on public.courses
  for insert
  to authenticated
  with check (true);

drop policy if exists courses_update_authenticated on public.courses;
create policy courses_update_authenticated
  on public.courses
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists courses_delete_authenticated on public.courses;
create policy courses_delete_authenticated
  on public.courses
  for delete
  to authenticated
  using (true);

drop policy if exists course_events_select_authenticated on public.course_events;
create policy course_events_select_authenticated
  on public.course_events
  for select
  to authenticated
  using (true);

drop policy if exists course_events_insert_authenticated on public.course_events;
create policy course_events_insert_authenticated
  on public.course_events
  for insert
  to authenticated
  with check (true);

drop policy if exists course_events_delete_authenticated on public.course_events;
create policy course_events_delete_authenticated
  on public.course_events
  for delete
  to authenticated
  using (true);

commit;
