-- ============================================================================
-- Ride ratings
--
-- After a ride is over, members of a group can rate the people they rode with
-- (1–5 stars + an optional note). Ratings build a reputation shown on profiles.
--
-- Privacy: a rater can only ever read their OWN ratings, so a ratee never sees
-- who gave them what. Public reputation is exposed only as an aggregate through
-- the profile_ratings view (average + count), never the individual rows.
-- ============================================================================

create table if not exists public.ratings (
  id         uuid primary key default gen_random_uuid(),
  rater_id   uuid not null references public.profiles(id) on delete cascade,
  ratee_id   uuid not null references public.profiles(id) on delete cascade,
  group_id   uuid not null references public.trip_groups(id) on delete cascade,
  score      int  not null check (score between 1 and 5),
  comment    text check (comment is null or length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rater_id, ratee_id, group_id),
  check (rater_id <> ratee_id)
);

create index if not exists ratings_ratee_idx on public.ratings (ratee_id);

alter table public.ratings enable row level security;

-- Read only the ratings you wrote.
drop policy if exists "Users see ratings they wrote" on public.ratings;
create policy "Users see ratings they wrote"
  on public.ratings for select to authenticated
  using (auth.uid() = rater_id);

-- Insert only: as yourself, for someone who shared a group with you, once your
-- own trip in that group has ended.
drop policy if exists "Members rate completed rides" on public.ratings;
create policy "Members rate completed rides"
  on public.ratings for insert to authenticated
  with check (
    auth.uid() = rater_id
    and rater_id <> ratee_id
    and exists (
      select 1 from public.trips t
      where t.group_id = ratings.group_id
        and t.user_id = rater_id
        and t.depart_window_end < now()
    )
    and exists (
      select 1 from public.trips t
      where t.group_id = ratings.group_id
        and t.user_id = ratee_id
    )
  );

-- Update your own rating (e.g. change your mind).
drop policy if exists "Users update their ratings" on public.ratings;
create policy "Users update their ratings"
  on public.ratings for update to authenticated
  using (auth.uid() = rater_id)
  with check (auth.uid() = rater_id);

-- ---------------------------------------------------------------------------
-- Public reputation: aggregate only. A view runs with its owner's privileges
-- (security_invoker is off by default), so callers get averages without being
-- able to read individual rating rows under RLS.
-- ---------------------------------------------------------------------------
create or replace view public.profile_ratings as
  select ratee_id as user_id,
         round(avg(score)::numeric, 1) as avg_score,
         count(*)::int as rating_count
    from public.ratings
   group by ratee_id;

grant select on public.profile_ratings to authenticated;
