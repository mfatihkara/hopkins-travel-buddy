-- ============================================================================
-- join_trip: a SECURITY DEFINER function that atomically joins two trips
-- into a trip_group. Bypasses RLS (necessary to update the *other* user's
-- trip), but enforces its own checks against auth.uid().
-- ============================================================================

create or replace function public.join_trip(other_trip_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id      uuid := auth.uid();
  other_trip     record;
  my_trip        record;
  target_group_id uuid;
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select id, user_id, airport,
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

  -- Find caller's most recent compatible trip
  select id, group_id, status
    into my_trip
    from trips
    where user_id = caller_id
      and airport = other_trip.airport
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

-- Let authenticated users call the function (it does its own permission check).
revoke all on function public.join_trip(uuid) from public;
grant execute on function public.join_trip(uuid) to authenticated;
