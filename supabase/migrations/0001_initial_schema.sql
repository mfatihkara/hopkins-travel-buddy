-- ============================================================================
-- Hopkins Travel Buddy — Initial Schema
-- Run in Supabase: SQL Editor → New query → paste this → Run
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- trip_groups: a shared ride containing 1+ trips
-- ---------------------------------------------------------------------------
create table public.trip_groups (
  id          uuid primary key default gen_random_uuid(),
  airport     text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- trips: one row per posted request
-- ---------------------------------------------------------------------------
create table public.trips (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  airport               text not null check (airport in ('BWI', 'IAD', 'DCA')),
  depart_window_start   timestamptz not null,
  depart_window_end     timestamptz not null,
  pickup_area           text not null,
  status                text not null default 'open' check (status in ('open', 'matched', 'closed')),
  group_id              uuid references public.trip_groups(id) on delete set null,
  created_at            timestamptz not null default now(),
  check (depart_window_start < depart_window_end)
);

create index trips_airport_window_idx on public.trips (airport, status, depart_window_start);
create index trips_user_idx on public.trips (user_id);

-- ---------------------------------------------------------------------------
-- messages: chat within a trip_group
-- ---------------------------------------------------------------------------
create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.trip_groups(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (length(body) > 0 and length(body) <= 2000),
  created_at  timestamptz not null default now()
);

create index messages_group_idx on public.messages (group_id, created_at);

-- ---------------------------------------------------------------------------
-- Auto-create a profile when a new auth user appears
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users that signed up before the trigger existed
insert into public.profiles (id, email)
select id, email from auth.users
where id not in (select id from public.profiles);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles    enable row level security;
alter table public.trip_groups enable row level security;
alter table public.trips       enable row level security;
alter table public.messages    enable row level security;

-- profiles
create policy "Profiles readable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- trip_groups
create policy "Trip groups readable by authenticated users"
  on public.trip_groups for select to authenticated using (true);

create policy "Authenticated users can create trip groups"
  on public.trip_groups for insert to authenticated with check (true);

-- trips
create policy "Trips readable by authenticated users"
  on public.trips for select to authenticated using (true);

create policy "Users post their own trips"
  on public.trips for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update their own trips"
  on public.trips for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users delete their own trips"
  on public.trips for delete to authenticated using (auth.uid() = user_id);

-- messages
create policy "Group members read messages"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.trips
      where trips.group_id = messages.group_id
        and trips.user_id  = auth.uid()
    )
  );

create policy "Group members post messages"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.trips
      where trips.group_id = messages.group_id
        and trips.user_id  = auth.uid()
    )
  );

-- ============================================================================
-- Realtime
-- ============================================================================
alter publication supabase_realtime add table public.messages;
