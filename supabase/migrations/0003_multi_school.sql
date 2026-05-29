-- ============================================================================
-- Multi-school support
-- Adds a `school` column (email domain) to profiles and trips so that
-- students only see and match with people from their own school.
-- ============================================================================

-- 1. Add school to profiles
alter table public.profiles
  add column if not exists school text not null default '';

-- Backfill existing profiles from their email domain
update public.profiles
  set school = split_part(email, '@', 2)
  where school = '';

-- Remove the default now that existing rows are filled
alter table public.profiles
  alter column school drop default;

-- 2. Update the new-user trigger to also populate school
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, school)
  values (
    new.id,
    new.email,
    split_part(new.email, '@', 2)
  );
  return new;
end;
$$;

-- 3. Add school to trips
alter table public.trips
  add column if not exists school text not null default '';

-- Backfill existing trips from their owner's profile
update public.trips t
  set school = p.school
  from public.profiles p
  where t.user_id = p.id
    and t.school = '';

alter table public.trips
  alter column school drop default;

-- 4. Add an index to speed up school-filtered queries
create index if not exists trips_school_idx on public.trips (school, status, depart_window_start);

-- 5. Update join_trip to enforce same-school matching
create or replace function public.join_trip(other_trip_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id       uuid := auth.uid();
  caller_school   text;
  other_trip      record;
  my_trip         record;
  target_group_id uuid;
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select school into caller_school
    from profiles
    where id = caller_id;

  select id, user_id, airport, school,
         depart_window_start, depart_window_end,
         group_id, status
    into other_trip
    from trips
    where id = other_trip_id;

  if not found then
    raise exception 'Trip not found';
  end if;

  if other_trip.user_id = caller_id then
    raise exception 'Cannot join your own trip';
  end if;

  if other_trip.status = 'closed' then
    raise exception 'Trip is closed';
  end if;

  if other_trip.school <> caller_school then
    raise exception 'Different school';
  end if;

  -- Find caller's most recent compatible trip
  select id, group_id, status
    into my_trip
    from trips
    where user_id = caller_id
      and airport = other_trip.airport
      and school  = caller_school
      and status <> 'closed'
      and depart_window_start <= other_trip.depart_window_end
      and depart_window_end   >= other_trip.depart_window_start
    order by created_at desc
    limit 1;

  if not found then
    raise exception 'No compatible trip';
  end if;

  -- Already in the same group — nothing to do.
  if my_trip.group_id is not null
     and my_trip.group_id = other_trip.group_id then
    return my_trip.group_id;
  end if;

  -- Decide which group to use, creating one if needed.
  if other_trip.group_id is null then
    insert into trip_groups (airport)
    values (other_trip.airport)
    returning id into target_group_id;

    update trips
      set group_id = target_group_id, status = 'matched'
      where id = other_trip.id;
  else
    target_group_id := other_trip.group_id;
  end if;

  update trips
    set group_id = target_group_id, status = 'matched'
    where id = my_trip.id;

  return target_group_id;
end;
$$;
