-- Realtime (postgres_changes) + RLS alignée sur la visibilité Palto (client vs chauffeur).
-- Après migration : activer Realtime sur `courses` et `course_events` dans le dashboard Supabase
-- si la publication n’est pas déjà appliquée (certaines stacks le font via UI).

begin;

-- Visibilité d’une course pour le JWT émis par /api/auth/realtime-token
-- Claims attendus : palto_role (client|chauffeur), email, driver_key (chauffeur uniquement).
create or replace function public.course_visible_for_realtime_jwt(c public.courses)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case coalesce(auth.jwt()->>'palto_role', '')
    when 'client' then
      c.client_id is not null
      and exists (
        select 1
        from public.clients cl
        where cl.id = c.client_id
          and cl.email is not null
          and lower(trim(cl.email)) = lower(nullif(trim(auth.jwt()->>'email'), ''))
      )
    when 'chauffeur' then
      (
        c.status = 'pending' and c.booking_kind = 'scheduled'::public.booking_kind
      )
      or (
        c.status = 'pending'
        and c.booking_kind = 'instant'::public.booking_kind
        and c.requested_driver_external_key is not distinct from nullif(trim(auth.jwt()->>'driver_key'), '')
      )
      or (
        c.status in (
          'accepted'::public.course_status,
          'in_progress'::public.course_status,
          'completed'::public.course_status,
          'cancelled'::public.course_status
        )
        and c.assigned_driver_external_key is not distinct from nullif(trim(auth.jwt()->>'driver_key'), '')
      )
    else false
  end;
$$;

drop policy if exists courses_select_authenticated on public.courses;
create policy courses_select_realtime_jwt
  on public.courses
  for select
  to authenticated
  using (public.course_visible_for_realtime_jwt(courses));

drop policy if exists course_events_select_authenticated on public.course_events;
create policy course_events_select_realtime_jwt
  on public.course_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.courses co
      where co.id = course_events.course_id
        and public.course_visible_for_realtime_jwt(co)
    )
  );

-- Publication Realtime (idempotent si déjà membre)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'courses'
    ) then
      alter publication supabase_realtime add table public.courses;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'course_events'
    ) then
      alter publication supabase_realtime add table public.course_events;
    end if;
  end if;
end $$;

commit;
