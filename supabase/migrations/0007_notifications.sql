-- ============================================================================
-- In-app notifications
--
-- A per-user feed of notifications shown via a bell in the app. Three sources:
--   * match    — someone joined your trip / you were matched into a group
--   * message  — someone messaged a ride group you're in
--   * reminder — your departure window is coming up
--
-- Notifications are written by SECURITY DEFINER functions / triggers (which
-- bypass RLS); users can only read, mark-read, and delete their own. Per-event
-- preferences on profiles let users mute any source.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Per-user preferences (default on)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists notify_match    boolean not null default true,
  add column if not exists notify_message  boolean not null default true,
  add column if not exists notify_reminder boolean not null default true;

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in ('match', 'message', 'reminder')),
  title      text not null,
  body       text,
  link       text not null default '/',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "Users read their own notifications" on public.notifications;
create policy "Users read their own notifications"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users update their own notifications" on public.notifications;
create policy "Users update their own notifications"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete their own notifications" on public.notifications;
create policy "Users delete their own notifications"
  on public.notifications for delete to authenticated
  using (auth.uid() = user_id);

-- Live updates for the bell badge.
alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------------
-- Message notifications: fan out to other group members on each new message.
-- Deduped — while a member still has an unread message notification for the
-- group, new messages don't pile up another entry.
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
begin
  select coalesce(full_name, split_part(email, '@', 1))
    into sender_name
    from profiles
    where id = NEW.user_id;

  insert into notifications (user_id, type, title, body, link)
  select distinct
         t.user_id,
         'message',
         coalesce(sender_name, 'Someone') || ' messaged your group',
         left(NEW.body, 120),
         '/groups/' || NEW.group_id
    from trips t
    join profiles p on p.id = t.user_id
   where t.group_id = NEW.group_id
     and t.user_id <> NEW.user_id
     and coalesce(p.notify_message, true)
     and not exists (
       select 1 from notifications n
        where n.user_id = t.user_id
          and n.type = 'message'
          and n.link = '/groups/' || NEW.group_id
          and n.read_at is null
     );

  return NEW;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.notify_on_message();

-- ---------------------------------------------------------------------------
-- join_trip: same as 0006, but notifies the other group member(s) on a match.
-- (create_trip_and_join calls this, so it's covered too.)
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
  caller_name     text;
  other_trip      record;
  my_trip         record;
  target_group_id uuid;
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select school, coalesce(full_name, split_part(email, '@', 1))
    into caller_school, caller_name
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

  if my_trip.group_id is not null
     and my_trip.group_id = other_trip.group_id then
    return my_trip.group_id;
  end if;

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

  -- Notify everyone now in the group except the person who just joined.
  insert into notifications (user_id, type, title, body, link)
  select distinct
         t.user_id,
         'match',
         'New ride match',
         coalesce(caller_name, 'Someone') || ' matched with you for ' || other_trip.airport,
         '/groups/' || target_group_id
    from trips t
    join profiles p on p.id = t.user_id
   where t.group_id = target_group_id
     and t.user_id <> caller_id
     and coalesce(p.notify_match, true);

  return target_group_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Departure reminders: insert a one-time reminder for trips departing within
-- the next 24h. Idempotent via trips.reminded_at. Run on a schedule (see note).
-- ---------------------------------------------------------------------------
alter table public.trips
  add column if not exists reminded_at timestamptz;

create or replace function public.enqueue_departure_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into notifications (user_id, type, title, body, link)
  select t.user_id,
         'reminder',
         'Upcoming ride to ' || t.airport,
         'Your ride window opens soon. Tap to coordinate with your group.',
         coalesce('/groups/' || t.group_id::text, '/')
    from trips t
    join profiles p on p.id = t.user_id
   where t.status <> 'closed'
     and t.reminded_at is null
     and t.depart_window_start > now()
     and t.depart_window_start <= now() + interval '24 hours'
     and coalesce(p.notify_reminder, true);

  update trips
     set reminded_at = now()
   where status <> 'closed'
     and reminded_at is null
     and depart_window_start > now()
     and depart_window_start <= now() + interval '24 hours';

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.enqueue_departure_reminders() from public;

-- To send reminders automatically, enable pg_cron (Supabase: Database →
-- Extensions → pg_cron) and schedule it, e.g. every 15 minutes:
--
--   select cron.schedule(
--     'departure-reminders', '*/15 * * * *',
--     $$ select public.enqueue_departure_reminders() $$
--   );
--
-- Until then you can run `select public.enqueue_departure_reminders();`
-- manually to test.
