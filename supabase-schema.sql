-- Masters Fantasy Golf Pool — Supabase Schema
-- Run this in the Supabase SQL editor after creating a new project.

-- Config: single row, pool state
create table pga_masters_config (
  id int primary key default 1 check (id = 1),
  pool_locked boolean not null default false,
  randoms_assigned boolean not null default false,
  live_scoring boolean not null default false
);

insert into pga_masters_config (id) values (1);

-- Users (participants)
create table pga_masters_users (
  id text primary key,
  name text not null,
  full_name text,
  email text not null unique,
  admin boolean not null default false,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- Teams (a user can have multiple teams)
create table pga_masters_teams (
  id text primary key,
  user_id text not null references pga_masters_users(id) on delete cascade,
  team_name text not null,
  created_at timestamptz not null default now()
);

-- Golfers (the Masters field)
create table pga_masters_golfers (
  id text primary key,
  name text not null,
  espn_name text,
  odds text,
  odds_numeric int not null default 99999,
  world_rank int,
  score_to_par int not null default 0,
  today int not null default 0,
  thru text not null default '',
  status text not null default 'active',
  sort_order int not null default 0,
  score_locked boolean not null default false
);

-- Selections (golfer-to-team assignments)
create table pga_masters_selections (
  id text primary key,
  team_id text not null references pga_masters_teams(id) on delete cascade,
  golfer_id text not null references pga_masters_golfers(id) on delete cascade,
  is_random boolean not null default false,
  picked_at timestamptz not null default now(),
  unique (team_id, golfer_id)
);

-- Score snapshots (for round-over-round rank comparison)
-- snapshot_date is the round's date (derived from event start + round - 1)
create table pga_masters_score_snapshots (
  id serial primary key,
  snapshot_date date not null,
  team_id text not null references pga_masters_teams(id) on delete cascade,
  aggregate_score int not null,
  rank int not null,
  unique (snapshot_date, team_id)
);

-- Enable RLS but allow anon access (casual pool, no security needed)
alter table pga_masters_config enable row level security;
alter table pga_masters_users enable row level security;
alter table pga_masters_teams enable row level security;
alter table pga_masters_golfers enable row level security;
alter table pga_masters_selections enable row level security;
alter table pga_masters_score_snapshots enable row level security;

create policy "anon_all_config" on pga_masters_config for all using (true) with check (true);
create policy "anon_all_users" on pga_masters_users for all using (true) with check (true);
create policy "anon_all_teams" on pga_masters_teams for all using (true) with check (true);
create policy "anon_all_golfers" on pga_masters_golfers for all using (true) with check (true);
create policy "anon_all_selections" on pga_masters_selections for all using (true) with check (true);
create policy "anon_all_snapshots" on pga_masters_score_snapshots for all using (true) with check (true);
