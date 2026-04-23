-- Rename tables to pga_masters_ prefix
-- Run in Supabase SQL editor. Order: leaf tables first, then parents.

ALTER TABLE score_snapshots RENAME TO pga_masters_score_snapshots;
ALTER TABLE selections RENAME TO pga_masters_selections;
ALTER TABLE teams RENAME TO pga_masters_teams;
ALTER TABLE golfers RENAME TO pga_masters_golfers;
ALTER TABLE users RENAME TO pga_masters_users;
ALTER TABLE config RENAME TO pga_masters_config;
