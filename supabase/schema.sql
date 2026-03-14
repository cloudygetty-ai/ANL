-- ═══════════════════════════════════════════════════════════════════════════
-- ANL — AllNightLong — Full Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";     -- spatial queries

-- ── Users ────────────────────────────────────────────────────────────────────
create table users (
  id            uuid primary key references auth.users(id) on delete cascade,
  phone         text unique not null,
  display_name  text not null default '',
  age           smallint not null default 18 check (age >= 18),
  gender        text not null default 'f' check (gender in ('f','m','tw','tm','nb')),
  bio           text default '',
  vibe          text default '',
  position      text default 'na' check (position in ('top','bottom','vers','side','na')),
  body_type     text,
  height_cm     smallint,
  vibe_tag_ids  text[] default '{}',
  photos        text[] default '{}',           -- signed storage URLs
  is_verified   boolean default false,
  is_premium    boolean default false,
  presence      text default 'offline' check (presence in ('online','away','offline')),
  last_active_at timestamptz default now(),
  push_token    text,
  blocked_ids   uuid[] default '{}',
  location      geography(Point, 4326),         -- PostGIS point (exact, server-only)
  fuzzy_lat     double precision,               -- fuzzed for client
  fuzzy_lng     double precision,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index on users using gist(location);    -- spatial index
create index on users(presence, last_active_at desc);
create index on users(gender);

-- ── Vibe tags ─────────────────────────────────────────────────────────────────
create table vibe_tags (
  id    text primary key,
  label text not null,
  emoji text
);
insert into vibe_tags values
  ('tonight-only',    'Tonight only',      '🔥'),
  ('down-for-anything','Down for anything', '😈'),
  ('no-strings',      'No strings',        '🎯'),
  ('good-vibes',      'Good vibes only',   '✨'),
  ('spontaneous',     'Spontaneous',       '⚡'),
  ('late-night-magic','Late night magic',  '🌙'),
  ('come-find-me',    'Come find me',      '📍'),
  ('free-tonight',    'Free tonight',      '🗓️'),
  ('lets-link',       'Let''s link',       '🤝'),
  ('adventurous',     'Adventurous',       '🧭'),
  ('just-got-out',    'Just got out',      '👀'),
  ('dream-energy',    'Dream energy',      '💭');

-- ── Matches ──────────────────────────────────────────────────────────────────
create table matches (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references users(id) on delete cascade,
  user_b     uuid not null references users(id) on delete cascade,
  score_a    smallint,                          -- match % from A's perspective
  score_b    smallint,
  status     text default 'pending' check (status in ('pending','matched','rejected')),
  created_at timestamptz default now(),
  unique(user_a, user_b)
);
create index on matches(user_a, status);
create index on matches(user_b, status);

-- ── Channels ─────────────────────────────────────────────────────────────────
create table channels (
  id           uuid primary key default gen_random_uuid(),
  type         text not null check (type in ('dm','event','venue','neighborhood')),
  name         text,
  dm_id        text unique,                     -- sorted user pair key for DMs
  member_ids   uuid[] default '{}',
  event_id     uuid,
  location     geography(Point, 4326),
  updated_at   timestamptz default now(),
  created_at   timestamptz default now()
);
create index on channels(type, updated_at desc);
create index on channels using gist(location);

-- ── Messages ─────────────────────────────────────────────────────────────────
create table messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references channels(id) on delete cascade,
  sender_id   uuid not null references users(id) on delete cascade,
  content     text default '',
  type        text default 'text' check (type in ('text','image','vibe','system')),
  image_url   text,
  read_by     uuid[] default '{}',
  expires_at  timestamptz,                      -- ephemeral messages
  created_at  timestamptz default now()
);
create index on messages(channel_id, created_at desc);

-- ── Message reads ─────────────────────────────────────────────────────────────
create table message_reads (
  channel_id  uuid references channels(id) on delete cascade,
  user_id     uuid references users(id) on delete cascade,
  read_at     timestamptz default now(),
  primary key (channel_id, user_id)
);

-- ── Vibes (anonymous taps) ────────────────────────────────────────────────────
create table vibes (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references users(id) on delete cascade,
  receiver_id  uuid not null references users(id) on delete cascade,
  created_at   timestamptz default now()
);
create index on vibes(receiver_id, created_at desc);

-- ── Events (map pins) ─────────────────────────────────────────────────────────
create table events (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text default 'party' check (type in ('party','bar','venue','popup')),
  location    geography(Point, 4326) not null,
  address     text,
  channel_id  uuid references channels(id),
  starts_at   timestamptz,
  ends_at     timestamptz,
  active_count int default 0,
  created_at  timestamptz default now()
);
create index on events using gist(location);
create index on events(starts_at, ends_at);

-- ── Night Pulse zones ────────────────────────────────────────────────────────
create table pulse_zones (
  id           text primary key,
  name         text not null,
  center       geography(Point, 4326),
  radius_m     int default 500,
  intensity    double precision default 0,
  active_count int default 0,
  trend        text default 'fading' check (trend in ('rising','peaking','fading')),
  peak_hour    smallint,
  updated_at   timestamptz default now()
);

-- ── Reports / blocks ──────────────────────────────────────────────────────────
create table reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references users(id) on delete cascade,
  reported_id  uuid not null references users(id) on delete cascade,
  reason       text,
  created_at   timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════

alter table users        enable row level security;
alter table matches      enable row level security;
alter table channels     enable row level security;
alter table messages     enable row level security;
alter table message_reads enable row level security;
alter table vibes        enable row level security;
alter table events       enable row level security;
alter table pulse_zones  enable row level security;
alter table reports      enable row level security;

-- Users: see others (with fuzzy coords only), edit own
create policy "users_select" on users for select using (true);
create policy "users_update" on users for update using (auth.uid() = id);
create policy "users_insert" on users for insert with check (auth.uid() = id);

-- Messages: members only
create policy "messages_select" on messages for select
  using (channel_id in (
    select id from channels where auth.uid() = any(member_ids)
  ));
create policy "messages_insert" on messages for insert
  with check (
    sender_id = auth.uid() and
    channel_id in (select id from channels where auth.uid() = any(member_ids))
  );

-- Channels: members see their channels
create policy "channels_select" on channels for select
  using (auth.uid() = any(member_ids) or type in ('event','venue','neighborhood'));
create policy "channels_insert" on channels for insert with check (auth.uid() = any(member_ids));

-- Vibes: own sent/received
create policy "vibes_select" on vibes for select
  using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy "vibes_insert" on vibes for insert with check (sender_id = auth.uid());

-- Events: public read
create policy "events_select" on events for select using (true);

-- Pulse zones: public read
create policy "pulse_zones_select" on pulse_zones for select using (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- Functions & Triggers
-- ═══════════════════════════════════════════════════════════════════════════

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger users_updated_at    before update on users    for each row execute function set_updated_at();
create trigger channels_updated_at before update on channels for each row execute function set_updated_at();

-- Get nearby users (fuzzy coords, respects blocked list)
create or replace function get_nearby_users(
  p_lat       double precision,
  p_lng       double precision,
  p_radius_m  int default 5000,
  p_gender    text default null,
  p_viewer_id uuid default null
)
returns table (
  id           uuid,
  display_name text,
  age          smallint,
  gender       text,
  vibe         text,
  vibe_tag_ids text[],
  is_premium   boolean,
  presence     text,
  last_active_at timestamptz,
  fuzzy_lat    double precision,
  fuzzy_lng    double precision,
  distance_m   double precision
)
language sql stable as $$
  select
    u.id, u.display_name, u.age, u.gender, u.vibe, u.vibe_tag_ids,
    u.is_premium, u.presence, u.last_active_at,
    u.fuzzy_lat, u.fuzzy_lng,
    st_distance(u.location::geography, st_point(p_lng, p_lat)::geography) as distance_m
  from users u
  where
    u.presence = 'online'
    and u.id != coalesce(p_viewer_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and (p_viewer_id is null or not (u.id = any(
      select unnest(blocked_ids) from users where id = p_viewer_id
    )))
    and st_dwithin(u.location::geography, st_point(p_lng, p_lat)::geography, p_radius_m)
    and (p_gender is null or u.gender = p_gender)
  order by distance_m asc
  limit 100;
$$;

-- Get or create DM channel
create or replace function get_or_create_dm(p_user_a uuid, p_user_b uuid)
returns uuid language plpgsql as $$
declare
  v_dm_id text;
  v_channel_id uuid;
begin
  v_dm_id := array_to_string(array(select unnest(array[p_user_a::text, p_user_b::text]) order by 1), ':');
  select id into v_channel_id from channels where dm_id = v_dm_id;
  if v_channel_id is null then
    insert into channels (type, dm_id, member_ids)
    values ('dm', v_dm_id, array[p_user_a, p_user_b])
    returning id into v_channel_id;
  end if;
  return v_channel_id;
end; $$;

-- Pulse snapshot (called by NightPulseService)
create or replace function get_pulse_snapshot()
returns json language sql stable as $$
  select json_build_object(
    'zones',      (select json_agg(row_to_json(z)) from pulse_zones z),
    'city_total', (select coalesce(sum(active_count), 0) from pulse_zones),
    'updated_at', extract(epoch from now()) * 1000
  );
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Realtime
-- ═══════════════════════════════════════════════════════════════════════════
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table pulse_zones;
alter publication supabase_realtime add table vibes;
alter publication supabase_realtime add table users;
