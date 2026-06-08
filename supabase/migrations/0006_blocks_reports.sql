-- ============================================================================
-- Trust & safety: blocking and reporting other users.
--
--   * blocks  — one row per (blocker -> blocked). Used to hide users from each
--               other's feed and to prevent matching, in BOTH directions.
--   * reports — a record of someone flagging another user. Insert-only for
--               regular users; review happens out-of-band via the service role.
--
-- A SECURITY DEFINER helper, blocked_with_me(), returns every user id in a
-- block relationship with the caller (either direction) without revealing who
-- blocked whom. join_trip / create_trip_and_join refuse to match blocked pairs.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- blocks
-- ---------------------------------------------------------------------------
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null check (reason in ('harassment','unsafe','spam','no_show','other')),
  details     text check (details is null or length(details) <= 1000),
  created_at  timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

create index if not exists reports_reported_idx on public.reports (reported_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.blocks  enable row level security;
alter table public.reports enable row level security;

-- blocks: you manage only the blocks you created. You can never read rows where
-- you are the blocked party, so nobody learns they've been blocked.
drop policy if exists "Users see their own blocks" on public.blocks;
create policy "Users see their own blocks"
  on public.blocks for select to authenticated
  using (auth.uid() = blocker_id);

drop policy if exists "Users create their own blocks" on public.blocks;
create policy "Users create their own blocks"
  on public.blocks for insert to authenticated
  with check (auth.uid() = blocker_id);

drop policy if exists "Users delete their own blocks" on public.blocks;
create policy "Users delete their own blocks"
  on public.blocks for delete to authenticated
  using (auth.uid() = blocker_id);

-- reports: insert-only for regular users. No select policy => no reads at all
-- (admins review via the service role, which bypasses RLS).
drop policy if exists "Users create their own reports" on public.reports;
create policy "Users create their own reports"
  on public.reports for insert to authenticated
  with check (auth.uid() = reporter_id);

-- ---------------------------------------------------------------------------
-- blocked_with_me(): every user id in a block relationship with the caller,
-- in either direction. SECURITY DEFINER so it can see blocks where the caller
-- is the blocked party, but it only ever returns the opposing user ids — never
-- which direction the block goes.
-- ---------------------------------------------------------------------------
create or replace function public.blocked_with_me()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select blocked_id from public.blocks where blocker_id = auth.uid()
  union
  select blocker_id from public.blocks where blocked_id = auth.uid()
$$;

revoke all on function public.blocked_with_me() from public;
grant execute on function public.blocked_with_me() to authenticated;

-- ---------------------------------------------------------------------------
-- join_trip: same as 0003 but refuses to match a blocked pair (either way).
-- ---------------------------------------------------------------------------
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

  if exists (
    select 1 from blocks
    where (blocker_id = caller_id and blocked_id = other_trip.user_id)
       or (blocker_id = other_trip.user_id and blocked_id = caller_id)
  ) then
    raise exception 'Blocked';
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

-- ---------------------------------------------------------------------------
-- create_trip_and_join: same as 0004 but refuses to match a blocked pair.
-- ---------------------------------------------------------------------------
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

  if exists (
    select 1 from blocks
    where (blocker_id = caller_id and blocked_id = target.user_id)
       or (blocker_id = target.user_id and blocked_id = caller_id)
  ) then
    raise exception 'Blocked';
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
