-- Payment tracking per rider per group.
-- Each trip row represents one rider in one group, so we hang the
-- payment state directly on trips rather than a separate table.

alter table public.trips
  add column if not exists paid_at          timestamptz,
  add column if not exists payment_intent_id text;

-- View: how many riders in a group have paid.
create or replace view public.group_payment_summary as
select
  group_id,
  count(*)                                    as total_riders,
  count(*) filter (where paid_at is not null) as paid_riders,
  bool_and(paid_at is not null)               as all_paid
from public.trips
where group_id is not null
group by group_id;

-- RLS: members can read the summary for their own groups.
-- (The view inherits RLS from the trips table, which already has
--  select policies for authenticated users.)
