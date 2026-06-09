-- ============================================================================
-- Seat limit + group organizer
--
--   * trips.max_riders       — how many people this trip can share a ride with
--                              (default 4, the typical rideshare capacity)
--   * trip_groups.max_riders — inherited from the organizer's trip at group
--                              creation; used for capacity enforcement
--   * trip_groups.organizer_id — the user whose trip others joined first;
--                              they will be the one who books the ride
--
-- join_trip() is updated to:
--   1. Record organizer_id + max_riders when creating a new group
--   2. Enforce the seat cap before adding a rider to an existing group
-- ============================================================================

alter table public.trips
  add column if not exists max_riders int not null default 4
    check (max_riders between 2 and 8);

alter table public.trip_groups
  add column if not exists organizer_id uuid
    references public.profiles(id) on delete set null,
  add column if not exists max_riders int not null default 4;

-- Backfill existing groups: organizer = earliest trip's owner.
update public.trip_groups tg
set organizer_id = (
  select t.user_id
  from public.trips t
  where t.group_id = tg.id
  order by t.created_at asc
  limit 1
)
where tg.organizer_id is null;

-- Re-create join_trip with capacity enforcement and organizer tracking.
create or replace function public.join_trip(other_trip_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id       uuid := auth.uid();
  other_trip      record;
  my_trip         record;
  target_group_id uuid;
  rider_count     int;
  group_max       int;
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select id, user_id, airport, max_riders,
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

  -- Find caller's most recent compatible trip.
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

  if other_trip.group_id is null then
    -- New group: organizer = the person whose trip is being joined.
    insert into trip_groups (airport, organizer_id, max_riders)
    values (other_trip.airport, other_trip.user_id, other_trip.max_riders)
    returning id into target_group_id;

    update trips
      set group_id = target_group_id, status = 'matched'
      where id = other_trip.id;
  else
    target_group_id := other_trip.group_id;

    -- Seat-limit check before adding another rider.
    select count(*) into rider_count
      from trips where group_id = target_group_id;

    select max_riders into group_max
      from trip_groups where id = target_group_id;

    if rider_count >= group_max then
      raise exception 'Group is full (% of % seats taken)', rider_count, group_max;
    end if;
  end if;

  update trips
    set group_id = target_group_id, status = 'matched'
    where id = my_trip.id;

  return target_group_id;
end;
$$;

revoke all on function public.join_trip(uuid) from public;
grant execute on function public.join_trip(uuid) to authenticated;
