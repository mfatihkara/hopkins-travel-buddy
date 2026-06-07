-- ============================================================================
-- Let a student join an existing trip without posting their own first.
-- create_trip_and_join creates a compatible trip on the caller's behalf
-- (same airport/school/window as the trip they want to join, using the
-- pickup area they provide) and then runs the normal join_trip flow.
-- ============================================================================

create or replace function public.create_trip_and_join(other_trip_id uuid, pickup_area text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id     uuid := auth.uid();
  caller_school text;
  trimmed_area  text := trim(coalesce(pickup_area, ''));
  target        record;
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if trimmed_area = '' then
    raise exception 'Pickup area is required';
  end if;

  if length(trimmed_area) > 100 then
    raise exception 'Pickup area is too long';
  end if;

  select school into caller_school
    from profiles
    where id = caller_id;

  select id, user_id, airport, school, status,
         depart_window_start, depart_window_end
    into target
    from trips
    where id = other_trip_id;

  if not found then
    raise exception 'Trip not found';
  end if;

  if target.user_id = caller_id then
    raise exception 'Cannot join your own trip';
  end if;

  if target.status = 'closed' then
    raise exception 'Trip is closed';
  end if;

  if target.school <> caller_school then
    raise exception 'Different school';
  end if;

  insert into trips (user_id, airport, school, depart_window_start, depart_window_end, pickup_area)
  values (caller_id, target.airport, caller_school, target.depart_window_start, target.depart_window_end, trimmed_area);

  -- The trip we just inserted matches the target exactly, so join_trip
  -- will pick it up as the caller's "compatible trip" and link the two.
  return join_trip(other_trip_id);
end;
$$;
