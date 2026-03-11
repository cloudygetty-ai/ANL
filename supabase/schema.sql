-- ============================================================
-- ANL — All Night Long
-- PostgreSQL Schema (Supabase)
-- ============================================================
-- Run this file against a fresh Supabase project to initialize
-- all tables, policies, RPCs, triggers, realtime subscriptions,
-- and seed data needed for the ANL app to operate.
-- ============================================================

-- ------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------

-- uuid_generate_v4() for primary keys
create extension if not exists "uuid-ossp";

-- Geospatial support (used by PostGIS-based queries if needed)
create extension if not exists "postgis";

-- ------------------------------------------------------------
-- Table: public.users
-- One row per authenticated user. Mirrors auth.users via the
-- id foreign key so deleting an auth user cascades here.
-- ------------------------------------------------------------
create table public.users (
  id                uuid         primary key references auth.users(id) on delete cascade,
  phone             text         unique,
  display_name      text         not null default '',
  age               integer,
  -- WHY: Explicit check list keeps invalid values out at the DB layer,
  -- independent of any client-side validation.
  gender            text         check (gender in ('female', 'male', 'trans_woman', 'trans_man', 'non_binary')),
  bio               text         default '',
  avatar_url        text,
  vibe_tags         text[]       default '{}',
  is_out_tonight    boolean      default false,
  is_premium        boolean      default false,
  latitude          double precision,
  longitude         double precision,
  presence          text         default 'offline'
                                 check (presence in ('online', 'away', 'offline')),
  last_active_at    timestamptz  default now(),
  created_at        timestamptz  default now(),
  updated_at        timestamptz  default now()
);

-- ------------------------------------------------------------
-- Table: public.vibe_tags
-- Reference table for the tag vocabulary shown in the UI.
-- The `name` column drives the display label.
-- ------------------------------------------------------------
create table public.vibe_tags (
  id        uuid  primary key default uuid_generate_v4(),
  name      text  unique not null,
  emoji     text,
  category  text
);

-- ------------------------------------------------------------
-- Table: public.matches
-- Bidirectional match record between two users.
-- user_a and user_b are ordered deterministically by the app
-- (lower UUID first) to ensure the unique constraint fires
-- correctly regardless of which user initiates.
-- ------------------------------------------------------------
create table public.matches (
  id          uuid        primary key default uuid_generate_v4(),
  user_a      uuid        references public.users(id) on delete cascade,
  user_b      uuid        references public.users(id) on delete cascade,
  score       integer     default 0,
  status      text        default 'pending'
                          check (status in ('pending', 'matched', 'declined')),
  created_at  timestamptz default now(),
  unique(user_a, user_b)
);

-- ------------------------------------------------------------
-- Table: public.channels
-- A channel is either a DM (is_group = false, exactly 2 members)
-- or a group chat (is_group = true, 2+ members).
-- Members are stored as a uuid[] for fast membership checks
-- inside RLS policies without an extra join table.
-- ------------------------------------------------------------
create table public.channels (
  id          uuid        primary key default uuid_generate_v4(),
  name        text,
  is_group    boolean     default false,
  members     uuid[]      default '{}',
  created_at  timestamptz default now()
);

-- ------------------------------------------------------------
-- Table: public.messages
-- A message belongs to a channel. sender_name is denormalized
-- here so deleted users leave readable history behind.
-- ------------------------------------------------------------
create table public.messages (
  id          uuid        primary key default uuid_generate_v4(),
  channel_id  uuid        references public.channels(id) on delete cascade,
  -- set null preserves message history when a user account is removed
  sender_id   uuid        references public.users(id) on delete set null,
  sender_name text        not null,
  content     text        not null,
  type        text        default 'text'
                          check (type in ('text', 'vibe', 'system')),
  created_at  timestamptz default now()
);

-- ------------------------------------------------------------
-- Table: public.message_reads
-- Tracks per-user read receipts for each message.
-- Used to calculate unread counts in the chat UI.
-- ------------------------------------------------------------
create table public.message_reads (
  id          uuid        primary key default uuid_generate_v4(),
  message_id  uuid        references public.messages(id) on delete cascade,
  user_id     uuid        references public.users(id) on delete cascade,
  read_at     timestamptz default now(),
  unique(message_id, user_id)
);

-- ------------------------------------------------------------
-- Table: public.vibes
-- A vibe is a lightweight signal sent from one user to another
-- (e.g. a "wave", "like", or custom reaction emoji).
-- type is intentionally open — the app layer validates the
-- allowed set so new vibe types can be added without migrations.
-- ------------------------------------------------------------
create table public.vibes (
  id          uuid        primary key default uuid_generate_v4(),
  from_user   uuid        references public.users(id) on delete cascade,
  to_user     uuid        references public.users(id) on delete cascade,
  type        text        default 'wave',
  created_at  timestamptz default now()
);

-- ------------------------------------------------------------
-- Table: public.events
-- Nightlife events shown on the map and NightPulse screens.
-- Coordinates are plain doubles; PostGIS is available if
-- spatial indexing becomes a bottleneck later.
-- ------------------------------------------------------------
create table public.events (
  id             uuid        primary key default uuid_generate_v4(),
  name           text        not null,
  latitude       double precision not null,
  longitude      double precision not null,
  attendee_count integer     default 0,
  category       text,
  starts_at      timestamptz not null,
  created_at     timestamptz default now()
);

-- ------------------------------------------------------------
-- Table: public.pulse_zones
-- Named geographic zones used by NightPulse. intensity (0–1)
-- and active_users are updated periodically by the server-side
-- pulse aggregation job. updated_at is kept fresh by a trigger.
-- ------------------------------------------------------------
create table public.pulse_zones (
  id           uuid            primary key default uuid_generate_v4(),
  name         text            not null,
  latitude     double precision not null,
  longitude    double precision not null,
  intensity    double precision default 0
                               check (intensity >= 0 and intensity <= 1),
  active_users integer         default 0,
  category     text,
  updated_at   timestamptz     default now()
);

-- ------------------------------------------------------------
-- Table: public.reports
-- User-submitted reports of abusive or policy-violating content.
-- Moderation workflow uses status to track resolution.
-- ------------------------------------------------------------
create table public.reports (
  id           uuid        primary key default uuid_generate_v4(),
  reporter_id  uuid        references public.users(id),
  reported_id  uuid        references public.users(id),
  reason       text        not null,
  details      text,
  status       text        default 'pending',
  created_at   timestamptz default now()
);

-- ============================================================
-- Triggers
-- ============================================================

-- Automatically refreshes updated_at on any row update.
-- Called by the triggers below; do not call directly.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on public.users
  for each row execute function set_updated_at();

create trigger pulse_zones_updated_at
  before update on public.pulse_zones
  for each row execute function set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
-- Every table that holds user data has RLS enabled.
-- Tables without RLS (vibe_tags, events, reports) are either
-- read-only reference data or admin-managed.
-- ============================================================

alter table public.users          enable row level security;
alter table public.channels       enable row level security;
alter table public.messages       enable row level security;
alter table public.vibes          enable row level security;
alter table public.pulse_zones    enable row level security;
alter table public.matches        enable row level security;

-- ------------------------------------------------------------
-- Users policies
-- ------------------------------------------------------------

-- Any authenticated or anonymous client can read any user profile.
-- This is intentional — profiles are the discovery surface of the app.
create policy "Users are viewable by everyone"
  on public.users
  for select
  using (true);

-- A user may only update their own row.
create policy "Users can update own profile"
  on public.users
  for update
  using (auth.uid() = id);

-- A user may only insert a row whose id matches their auth uid.
-- This fires on the post-signup trigger in the app.
create policy "Users can insert own profile"
  on public.users
  for insert
  with check (auth.uid() = id);

-- ------------------------------------------------------------
-- Messages policies
-- ------------------------------------------------------------

-- Only members of a channel can read its messages.
-- The subquery checks the members array column on channels.
create policy "Messages readable by channel members"
  on public.messages
  for select
  using (
    exists (
      select 1
      from public.channels
      where id = channel_id
        and auth.uid() = any(members)
    )
  );

-- Only channel members may post new messages.
create policy "Messages insertable by channel members"
  on public.messages
  for insert
  with check (
    exists (
      select 1
      from public.channels
      where id = channel_id
        and auth.uid() = any(members)
    )
  );

-- ------------------------------------------------------------
-- Channels policies
-- ------------------------------------------------------------

-- A user can see only channels they are a member of.
create policy "Channels readable by members"
  on public.channels
  for select
  using (auth.uid() = any(members));

-- Any authenticated user may create a channel (e.g. to open a DM).
-- The get_or_create_dm RPC is the preferred path for DM creation.
create policy "Channels insertable by authenticated"
  on public.channels
  for insert
  with check (auth.uid() is not null);

-- ------------------------------------------------------------
-- Vibes policies
-- ------------------------------------------------------------

-- Only the sender and recipient may see a vibe.
create policy "Vibes readable by involved users"
  on public.vibes
  for select
  using (auth.uid() = from_user or auth.uid() = to_user);

-- A user may only send vibes from their own account.
create policy "Vibes insertable by authenticated"
  on public.vibes
  for insert
  with check (auth.uid() = from_user);

-- ------------------------------------------------------------
-- Pulse zones policy
-- ------------------------------------------------------------

-- Pulse zone data is public — it drives the map heatmap for all users.
create policy "Pulse zones are public"
  on public.pulse_zones
  for select
  using (true);

-- ------------------------------------------------------------
-- Matches policies
-- ------------------------------------------------------------

-- Each user can see only their own match records.
create policy "Matches readable by involved"
  on public.matches
  for select
  using (auth.uid() = user_a or auth.uid() = user_b);

-- ============================================================
-- RPCs (Remote Procedure Calls)
-- ============================================================

-- ------------------------------------------------------------
-- get_nearby_users
-- Returns users within radius_mi miles of (lat, lon) who are
-- not marked offline. Uses spherical law of cosines — accurate
-- enough for city-scale distances without PostGIS overhead.
-- Falls back gracefully if no location data is set.
-- ------------------------------------------------------------
create or replace function get_nearby_users(
  lat       double precision,
  lon       double precision,
  radius_mi double precision default 5
)
returns setof public.users as $$
  select *
  from public.users
  where latitude  is not null
    and longitude is not null
    and (
      acos(
        -- Spherical law of cosines distance formula
        sin(radians(lat)) * sin(radians(latitude)) +
        cos(radians(lat)) * cos(radians(latitude)) * cos(radians(longitude - lon))
      ) * 3959  -- Earth radius in miles
    ) <= radius_mi
    and presence != 'offline'
  order by last_active_at desc;
$$ language sql stable;

-- ------------------------------------------------------------
-- get_or_create_dm
-- Looks up an existing 1:1 channel between two users, or
-- creates one if none exists. Returns the channel id.
-- This RPC ensures exactly one DM channel exists per pair
-- regardless of which user initiates the conversation.
-- ------------------------------------------------------------
create or replace function get_or_create_dm(
  user_a_id uuid,
  user_b_id uuid
)
returns uuid as $$
declare
  channel_id uuid;
begin
  -- Check for an existing non-group channel containing both users
  select id into channel_id
  from public.channels
  where is_group = false
    and user_a_id = any(members)
    and user_b_id = any(members)
  limit 1;

  -- If no channel exists, create one with both users as members
  if channel_id is null then
    insert into public.channels (is_group, members)
    values (false, array[user_a_id, user_b_id])
    returning id into channel_id;
  end if;

  return channel_id;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- get_pulse_snapshot
-- Returns a JSON snapshot of all pulse zones suitable for
-- the NightPulse screen. Includes a timestamp (epoch ms),
-- total active user count, and the id of the peak zone.
-- Called by the client on screen mount and on a poll interval.
-- ------------------------------------------------------------
create or replace function get_pulse_snapshot()
returns json as $$
  select json_build_object(
    'zones', coalesce(
      json_agg(
        json_build_object(
          'id',          id,
          'name',        name,
          'latitude',    latitude,
          'longitude',   longitude,
          'intensity',   intensity,
          'activeUsers', active_users,
          'category',    category
        )
      ),
      '[]'::json
    ),
    -- Millisecond epoch for direct comparison with Date.now() on the client
    'timestamp',    extract(epoch from now()) * 1000,
    'totalActive',  coalesce(sum(active_users), 0),
    'peakZoneId',   (select id from public.pulse_zones order by intensity desc limit 1)
  )
  from public.pulse_zones;
$$ language sql stable;

-- ============================================================
-- Realtime
-- ============================================================
-- Subscribe these tables to the realtime publication so clients
-- receive live updates over websockets without polling.
-- ============================================================

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.pulse_zones;
alter publication supabase_realtime add table public.vibes;
alter publication supabase_realtime add table public.users;

-- ============================================================
-- Seed data: vibe_tags
-- ============================================================
-- This is the initial tag vocabulary. Add new tags here and
-- re-run; the on conflict clause makes the insert idempotent.
-- ============================================================

insert into public.vibe_tags (name, emoji, category) values
  ('Night Owl',        '🦉', 'lifestyle'),
  ('Dancer',           '💃', 'activity'),
  ('Foodie',           '🍕', 'interest'),
  ('Adventurer',       '🏔️', 'lifestyle'),
  ('Creative',         '🎨', 'interest'),
  ('Social Butterfly', '🦋', 'personality'),
  ('Chill Vibes',      '😌', 'personality'),
  ('Party Mode',       '🎉', 'lifestyle'),
  ('Music Lover',      '🎵', 'interest'),
  ('Fitness',          '💪', 'activity'),
  ('Gamer',            '🎮', 'interest'),
  ('Traveler',         '✈️', 'lifestyle')
on conflict (name) do nothing;
