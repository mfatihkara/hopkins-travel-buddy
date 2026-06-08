-- ============================================================================
-- Fare-split estimate
--
-- A per-group estimated total rideshare fare, so the app can show each rider
-- their share. The group can edit the total to a real quote from their
-- rideshare app. Groundwork for in-app payment later.
--
-- Stored on trip_groups; edited only via set_group_fare(), which checks the
-- caller is a member and limits writes to this one column (so members can't
-- alter anything else on the group).
-- ============================================================================

alter table public.trip_groups
  add column if not exists fare_estimate_cents int
    check (fare_estimate_cents is null
           or (fare_estimate_cents >= 0 and fare_estimate_cents <= 1000000));

create or replace function public.set_group_fare(p_group_id uuid, p_cents int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_cents is null or p_cents < 0 or p_cents > 1000000 then
    raise exception 'Invalid amount';
  end if;

  if not exists (
    select 1 from trips
    where group_id = p_group_id and user_id = caller_id
  ) then
    raise exception 'Not a member';
  end if;

  update trip_groups
     set fare_estimate_cents = p_cents
   where id = p_group_id;
end;
$$;

revoke all on function public.set_group_fare(uuid, int) from public;
grant execute on function public.set_group_fare(uuid, int) to authenticated;
