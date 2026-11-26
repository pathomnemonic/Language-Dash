-- ===================================================================================================================
-- Language Dash in a SHARED Supabase project: everything lives in the schema "language_dash". Nothing is created in "public".
--
-- GENERATED FILE - do not edit by hand. Regenerate with:   node tools/ld-migrate/generate.mjs
-- Source: database/*.sql (schema.sql=aab7c04601e799be policies.sql=f9e6655dc98820b7 cohorts.sql=c29e96b391e2d298 discovery.sql=bca2b4a571e153a5 pro.sql=582ed0f952695d3c analytics.sql=9e9eaf91481ab26b analytics_views.sql=7ee1b396e5e8a29e lockdown.sql=8652950c3e186272 audit.sql=9aaca59d7da385a4)
-- How it works and how to verify it: docs/SHARED-PROJECT-MIGRATION.md
--
-- Safe to run more than once. Runs in ONE transaction; the guard below aborts if search_path did not take effect, so a
-- statement can never fall through to "public".
-- ===================================================================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS language_dash;
SET LOCAL search_path = language_dash, pg_temp;

DO $guard$
BEGIN
  IF current_schema() IS DISTINCT FROM 'language_dash' THEN
    RAISE EXCEPTION 'Language Dash migration refused: search_path is %, not language_dash (is this running inside a transaction?)', current_setting('search_path');
  END IF;
END
$guard$;

-- ===================================================================================================================
-- MEMBERSHIP LAYER (hand-written, not from database/*.sql)
--
-- One sign-in per person lives in the shared auth.users pool. Language Dash membership is a separate, deliberate step:
-- language_dash.join_language_dash() is the ONLY way a row appears in language_dash.members. Signing in through another
-- app creates nothing here. Every table that holds member data is closed to non-members by the restrictive policy
-- ld_member_gate, and every function that acts for the caller starts with a membership check.
-- ===================================================================================================================

CREATE TABLE IF NOT EXISTS language_dash.members (
  user_id   uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE language_dash.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS members_select_own ON language_dash.members;
CREATE POLICY members_select_own ON language_dash.members FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
-- (no INSERT / UPDATE / DELETE policy and no privilege: clients cannot write this table directly)
REVOKE ALL ON language_dash.members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON language_dash.members TO authenticated;

-- Is the caller a Language Dash member? (stable, security definer: used by the gate policies)
CREATE OR REPLACE FUNCTION language_dash.is_member() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM language_dash.members WHERE user_id = auth.uid())
$$;

-- Raises not_a_member (SQLSTATE 42501) for a non-member. Internal: first statement of gated SQL-language functions.
CREATE OR REPLACE FUNCTION language_dash.require_member() RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
END $$;

-- { member boolean, joined_at timestamptz } for the caller
CREATE OR REPLACE FUNCTION language_dash.my_membership() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE j timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('member', false, 'joined_at', NULL); END IF;
  SELECT joined_at INTO j FROM language_dash.members WHERE user_id = auth.uid();
  RETURN jsonb_build_object('member', j IS NOT NULL, 'joined_at', j);
END $$;

-- Become a Language Dash member (idempotent). The only code path that inserts into members.
CREATE OR REPLACE FUNCTION language_dash.join_language_dash() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE me uuid := auth.uid(); j timestamptz;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_signed_in' USING ERRCODE = '28000'; END IF;
  INSERT INTO language_dash.members (user_id) VALUES (me) ON CONFLICT (user_id) DO NOTHING;
  SELECT joined_at INTO j FROM language_dash.members WHERE user_id = me;
  RETURN jsonb_build_object('member', true, 'joined_at', j);
END $$;

REVOKE ALL ON FUNCTION language_dash.is_member(), language_dash.require_member(), language_dash.my_membership(),
  language_dash.join_language_dash() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION language_dash.is_member(), language_dash.my_membership(), language_dash.join_language_dash() TO authenticated;

-- ===================================================================================================================
-- from database/schema.sql
-- ===================================================================================================================

-- ================================================================
-- Language Dash — Supabase schema
-- Version: 2.0.0
--
-- Run this file FIRST, then policies.sql, in the Supabase SQL editor.
-- Both files are safe to re-run.
--
-- Also required in the Supabase dashboard:
--   Authentication -> Providers -> enable "Allow anonymous sign-ins"
--   (the game signs players in anonymously so scores and friends work
--   without a password; players may optionally link an email later).
-- ================================================================

-- ==================== PLAYER PROFILES ====================

CREATE TABLE IF NOT EXISTS player_profiles (
  user_id      uuid PRIMARY KEY REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  player_name  text NOT NULL DEFAULT 'Anonymous' CHECK (char_length(player_name) BETWEEN 1 AND 30),
  avatar       text NOT NULL DEFAULT 'avatar_intern' CHECK (char_length(avatar) <= 64),
  badges       text[] NOT NULL DEFAULT '{}' CHECK (cardinality(badges) <= 6),
  best_score   integer NOT NULL DEFAULT 0 CHECK (best_score >= 0),
  best_streak  integer NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  visible      boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_profiles_name_idx ON player_profiles (lower(player_name));


-- ==================== SCORES ====================

CREATE TABLE IF NOT EXISTS scores (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  player_name  text NOT NULL CHECK (char_length(player_name) BETWEEN 1 AND 30),
  avatar       text NOT NULL DEFAULT 'avatar_intern' CHECK (char_length(avatar) <= 64),
  score        integer NOT NULL CHECK (score >= 0),
  accuracy     integer NOT NULL DEFAULT 0 CHECK (accuracy BETWEEN 0 AND 100),
  best_streak  integer NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  speed        numeric NOT NULL DEFAULT 1 CHECK (speed > 0 AND speed <= 10),
  mode         text NOT NULL DEFAULT 'endless' CHECK (char_length(mode) <= 32),
  badges       text[] NOT NULL DEFAULT '{}' CHECK (cardinality(badges) <= 6),
  run_id       text NOT NULL UNIQUE CHECK (char_length(run_id) <= 64),
  season       text NOT NULL DEFAULT 'default' CHECK (char_length(season) <= 32),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scores_board_idx ON scores (mode, season, score DESC);
CREATE INDEX IF NOT EXISTS scores_user_idx ON scores (user_id);

-- Basic sanity limits on scores submitted by players (the app signs in, so these
-- run for real clients; admin and SQL-editor inserts are not limited).
-- One score per player per 20 seconds, and an absolute ceiling. This stops a
-- script flooding the leaderboard; it is not a full anti-cheat.
CREATE OR REPLACE FUNCTION scores_sanity() RETURNS trigger
LANGUAGE plpgsql SET search_path = language_dash, pg_temp
AS $$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;
  IF NEW.score > 5000000 OR NEW.best_streak > 1000 THEN
    RAISE EXCEPTION 'score outside the believable range' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM scores WHERE user_id = NEW.user_id AND created_at > now() - interval '20 seconds') THEN
    RAISE EXCEPTION 'scores are coming in too fast' USING ERRCODE = '54000';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS scores_sanity_trg ON scores;
CREATE TRIGGER scores_sanity_trg BEFORE INSERT ON scores
  FOR EACH ROW EXECUTE FUNCTION scores_sanity();


-- Keep only each player's best run per mode and season, so the table (and every board built from it)
-- is never cluttered with lower runs. A run that does not beat the stored best is ignored (the insert
-- succeeds but adds nothing); one that does replaces the old row. Safe to re-run.
CREATE OR REPLACE FUNCTION scores_keep_best() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM scores
    WHERE user_id = NEW.user_id AND mode = NEW.mode AND season = NEW.season AND score >= NEW.score
  ) THEN
    RETURN NULL;
  END IF;
  DELETE FROM scores WHERE user_id = NEW.user_id AND mode = NEW.mode AND season = NEW.season;
  RETURN NEW;
END $$;

-- (Named so it fires after scores_sanity_trg: the flood and range checks run first.)
DROP TRIGGER IF EXISTS scores_keep_best_trg ON scores;
DROP TRIGGER IF EXISTS scores_zkeep_best_trg ON scores;
CREATE TRIGGER scores_zkeep_best_trg BEFORE INSERT ON scores
  FOR EACH ROW EXECUTE FUNCTION scores_keep_best();

-- One-time tidy-up of runs saved before this rule: keep the best row per player, mode and season.
DELETE FROM scores s
USING scores better
WHERE better.user_id = s.user_id AND better.mode = s.mode AND better.season = s.season
  AND (better.score > s.score OR (better.score = s.score AND better.id < s.id));


-- ==================== FRIENDS ====================

CREATE TABLE IF NOT EXISTS friends (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  requester_id  uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  addressee_id  uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_id <> addressee_id)
);

-- One relationship per pair, regardless of direction.
CREATE UNIQUE INDEX IF NOT EXISTS friends_pair_idx
  ON friends (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS friends_addressee_idx ON friends (addressee_id, status);


-- ==================== FRIEND BLOCKS ====================

CREATE TABLE IF NOT EXISTS friend_blocks (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  blocker_id  uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);


-- ==================== MATCH INVITES ====================

CREATE TABLE IF NOT EXISTS match_invites (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_user   uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  to_user     uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  room_code   text NOT NULL CHECK (char_length(room_code) BETWEEN 1 AND 10),
  match_id    text,
  mode        text NOT NULL DEFAULT 'mp_highscore' CHECK (char_length(mode) <= 32),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  CHECK (from_user <> to_user)
);

CREATE INDEX IF NOT EXISTS match_invites_to_idx ON match_invites (to_user, status, expires_at);


-- Is there a block in either direction between two users? SECURITY DEFINER so
-- policies can see blocks made by the *other* person (RLS hides them from the
-- caller), without exposing who blocked whom.
CREATE OR REPLACE FUNCTION has_block_between(a uuid, b uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = language_dash, pg_temp AS $$
  -- (only about the caller: asking about two other people's blocks would reveal who blocked whom)
  SELECT auth.uid() IN (a, b) AND EXISTS (
    SELECT 1 FROM friend_blocks
    WHERE (blocker_id = a AND blocked_id = b) OR (blocker_id = b AND blocked_id = a)
  );
$$;


-- ==================== USER REPORTS ====================

CREATE TABLE IF NOT EXISTS user_reports (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reporter_id  uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  reported_id  uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  reason       text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500),
  created_at   timestamptz NOT NULL DEFAULT now()
);


-- ==================== LEADERBOARD VIEW ====================
-- One best entry per user / mode / season, hiding players who turned their
-- profile visibility off. security_invoker makes the view obey RLS.

CREATE OR REPLACE VIEW leaderboard_best
WITH (security_invoker = true) AS
SELECT DISTINCT ON (s.user_id, s.mode, s.season)
  s.user_id, s.player_name, s.avatar, s.score, s.accuracy, s.best_streak,
  s.speed, s.mode, s.badges, s.season, s.created_at
FROM scores s
JOIN player_profiles p ON p.user_id = s.user_id AND p.visible = true
ORDER BY s.user_id, s.mode, s.season, s.score DESC, s.created_at ASC;


-- All-time best per user / mode across every season.
CREATE OR REPLACE VIEW leaderboard_alltime
WITH (security_invoker = true) AS
SELECT DISTINCT ON (s.user_id, s.mode)
  s.user_id, s.player_name, s.avatar, s.score, s.accuracy, s.best_streak,
  s.speed, s.mode, s.badges, s.season, s.created_at
FROM scores s
JOIN player_profiles p ON p.user_id = s.user_id AND p.visible = true
ORDER BY s.user_id, s.mode, s.score DESC, s.created_at ASC;


-- ==================== CARD REPORTS ====================
-- Content feedback from players ("this card is wrong / ambiguous").

CREATE TABLE IF NOT EXISTS card_reports (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reporter_id  uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  card_id      text NOT NULL CHECK (char_length(card_id) <= 64),
  reason       text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 100),
  details      text NOT NULL DEFAULT '' CHECK (char_length(details) <= 1000),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS card_reports_card_idx ON card_reports (card_id);


-- ==================== PROFILE UPSERT ====================
-- SECURITY DEFINER so bests can only ever go up (GREATEST). The caller can
-- only touch their own row: p_user_id must equal auth.uid().

CREATE OR REPLACE FUNCTION upsert_player_profile(
  p_user_id     uuid,
  p_player_name text,
  p_avatar      text,
  p_badges      text[],
  p_best_score  integer,
  p_best_streak integer,
  p_visible     boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = language_dash, pg_temp
AS $$
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  INSERT INTO player_profiles AS pp
    (user_id, player_name, avatar, badges, best_score, best_streak, visible)
  VALUES (
    p_user_id,
    left(coalesce(nullif(trim(p_player_name), ''), 'Anonymous'), 30),
    left(coalesce(p_avatar, 'avatar_intern'), 64),
    coalesce(p_badges[1:6], '{}'),
    greatest(coalesce(p_best_score, 0), 0),
    greatest(coalesce(p_best_streak, 0), 0),
    coalesce(p_visible, true)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    player_name = EXCLUDED.player_name,
    avatar      = EXCLUDED.avatar,
    badges      = EXCLUDED.badges,
    best_score  = GREATEST(pp.best_score, EXCLUDED.best_score),
    best_streak = GREATEST(pp.best_streak, EXCLUDED.best_streak),
    visible     = EXCLUDED.visible,
    updated_at  = now();
END;
$$;


-- ==================== STUDY GROUPS ====================
-- Private boards for a class or study group. Membership is by invite code.
-- All writes go through the SECURITY DEFINER functions below.

CREATE TABLE IF NOT EXISTS study_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 40),
  code        text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{6}$'),
  owner_id    uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE study_groups ADD COLUMN IF NOT EXISTS weekly_goal integer
  CHECK (weekly_goal IS NULL OR weekly_goal BETWEEN 50 AND 100000);

CREATE TABLE IF NOT EXISTS group_members (
  group_id   uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS group_members_user_idx ON group_members (user_id);

-- Avoids RLS recursion when a policy needs to ask "am I a member?".
CREATE OR REPLACE FUNCTION is_group_member(gid uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = language_dash, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM group_members WHERE group_id = gid AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION create_group(p_name text) RETURNS study_groups
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  g study_groups;
  attempts int := 0;
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF (SELECT count(*) FROM study_groups WHERE owner_id = auth.uid()) >= 5 THEN
    RAISE EXCEPTION 'You can own at most 5 groups';
  END IF;
  LOOP
    BEGIN
      INSERT INTO study_groups (name, code, owner_id)
      VALUES (left(trim(p_name), 40), upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)), auth.uid())
      RETURNING * INTO g;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      attempts := attempts + 1;
      IF attempts > 5 THEN RAISE EXCEPTION 'could not allocate a code'; END IF;
    END;
  END LOOP;
  INSERT INTO group_members (group_id, user_id) VALUES (g.id, auth.uid());
  RETURN g;
END;
$$;

CREATE OR REPLACE FUNCTION join_group(p_code text) RETURNS study_groups
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE g study_groups;
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT * INTO g FROM study_groups WHERE code = upper(trim(p_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'No group with that code'; END IF;
  IF (SELECT count(*) FROM group_members WHERE group_id = g.id) >= 100 THEN
    RAISE EXCEPTION 'This group is full';
  END IF;
  INSERT INTO group_members (group_id, user_id) VALUES (g.id, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN g;
END;
$$;

CREATE OR REPLACE FUNCTION leave_group(p_group_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  DELETE FROM group_members WHERE group_id = p_group_id AND user_id = auth.uid();
  -- An empty group is removed.
  IF NOT EXISTS (SELECT 1 FROM group_members WHERE group_id = p_group_id) THEN
    DELETE FROM study_groups WHERE id = p_group_id;
  END IF;
END;
$$;

-- (Return type gained weekly_goal, so re-creating requires a drop.)
DROP FUNCTION IF EXISTS my_groups();
CREATE OR REPLACE FUNCTION my_groups()
RETURNS TABLE (id uuid, name text, code text, member_count bigint, is_owner boolean, weekly_goal integer)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = language_dash, pg_temp AS $$
  SELECT language_dash.require_member();
  SELECT g.id, g.name, g.code,
         (SELECT count(*) FROM group_members m2 WHERE m2.group_id = g.id),
         g.owner_id = auth.uid(), g.weekly_goal
  FROM study_groups g
  JOIN group_members m ON m.group_id = g.id AND m.user_id = auth.uid()
  ORDER BY g.created_at;
$$;

-- Best scores among the group's members. p_period: 'week' (current ISO week) or 'all'.
CREATE OR REPLACE FUNCTION group_leaderboard(p_group_id uuid, p_mode text, p_period text)
RETURNS TABLE (user_id uuid, player_name text, avatar text, score integer, accuracy integer, best_streak integer)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF NOT is_group_member(p_group_id) THEN RAISE EXCEPTION 'not a member of this group'; END IF;
  IF p_period = 'all' THEN
    RETURN QUERY
      SELECT lb.user_id, lb.player_name, lb.avatar, lb.score, lb.accuracy, lb.best_streak
      FROM group_members gm JOIN leaderboard_alltime lb ON lb.user_id = gm.user_id
      WHERE gm.group_id = p_group_id AND lb.mode = p_mode
      ORDER BY lb.score DESC LIMIT 50;
  ELSE
    RETURN QUERY
      SELECT lb.user_id, lb.player_name, lb.avatar, lb.score, lb.accuracy, lb.best_streak
      FROM group_members gm JOIN leaderboard_best lb ON lb.user_id = gm.user_id
      WHERE gm.group_id = p_group_id AND lb.mode = p_mode
        AND lb.season = to_char(now() AT TIME ZONE 'utc', 'IYYY-"W"IW')
      ORDER BY lb.score DESC LIMIT 50;
  END IF;
END;
$$;


-- ==================== SHARED DECKS ====================
-- Custom card decks shared by code. Decks cannot be listed: the only way to
-- read one is get_shared_deck() with its code.

CREATE TABLE IF NOT EXISTS shared_decks (
  code        text PRIMARY KEY CHECK (code ~ '^[A-Z0-9]{8}$'),
  owner_id    uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  card_count  integer NOT NULL CHECK (card_count BETWEEN 1 AND 200),
  cards       jsonb NOT NULL CHECK (jsonb_typeof(cards) = 'array' AND pg_column_size(cards) < 400000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION publish_deck(p_name text, p_cards jsonb) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  c text;
  n integer;
  attempts int := 0;
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF jsonb_typeof(p_cards) <> 'array' THEN RAISE EXCEPTION 'cards must be an array'; END IF;
  n := jsonb_array_length(p_cards);
  IF n < 1 OR n > 200 THEN RAISE EXCEPTION 'A deck must have 1 to 200 cards'; END IF;
  IF (SELECT count(*) FROM shared_decks WHERE owner_id = auth.uid()) >= 20 THEN
    RAISE EXCEPTION 'You can share at most 20 decks';
  END IF;
  LOOP
    BEGIN
      c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
      INSERT INTO shared_decks (code, owner_id, name, card_count, cards)
      VALUES (c, auth.uid(), left(trim(p_name), 60), n, p_cards);
      RETURN c;
    EXCEPTION WHEN unique_violation THEN
      attempts := attempts + 1;
      IF attempts > 5 THEN RAISE EXCEPTION 'could not allocate a code'; END IF;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION get_shared_deck(p_code text)
RETURNS TABLE (name text, card_count integer, cards jsonb)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = language_dash, pg_temp AS $$
  SELECT language_dash.require_member();
  SELECT d.name, d.card_count, d.cards FROM shared_decks d WHERE d.code = upper(trim(p_code));
$$;


-- ==================== SEASON STANDING (weekly tournament) ====================
-- The caller's rank among everyone with a score for a mode + season.

CREATE OR REPLACE FUNCTION season_standing(p_mode text, p_season text)
RETURNS TABLE (rank bigint, total bigint)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = language_dash, pg_temp AS $$
  SELECT language_dash.require_member();
  SELECT
    (SELECT count(*) + 1 FROM leaderboard_best b
      WHERE b.mode = p_mode AND b.season = p_season
        AND b.score > (SELECT m.score FROM leaderboard_best m
                        WHERE m.user_id = auth.uid() AND m.mode = p_mode AND m.season = p_season)),
    (SELECT count(*) FROM leaderboard_best b WHERE b.mode = p_mode AND b.season = p_season)
  WHERE EXISTS (SELECT 1 FROM leaderboard_best m
                 WHERE m.user_id = auth.uid() AND m.mode = p_mode AND m.season = p_season);
$$;


-- ==================== ACTIVITY FEED ====================
-- Short "Sam hit a 20 streak" events, visible to the poster and their friends.

CREATE TABLE IF NOT EXISTS activity_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('new_best', 'streak', 'tournament', 'exam', 'group_join')),
  payload     jsonb NOT NULL DEFAULT '{}' CHECK (pg_column_size(payload) < 1000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_events_user_idx ON activity_events (user_id, created_at DESC);

-- Strava-style feed: runs can be shared with friends or kept private, and friends can give kudos.
-- (The list of kinds grew, so the old check is replaced.)
ALTER TABLE activity_events DROP CONSTRAINT IF EXISTS activity_events_kind_check;
ALTER TABLE activity_events ADD CONSTRAINT activity_events_kind_check
  CHECK (kind IN ('new_best', 'streak', 'tournament', 'exam', 'group_join', 'run', 'milestone', 'streak_days', 'weekly_recap'));
ALTER TABLE activity_events ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'friends'
  CHECK (visibility IN ('friends', 'private'));

-- Can the caller see a post by this owner with this visibility? (Takes the row's own values rather than its id,
-- so the read policy also works for a row that is being inserted.)
CREATE OR REPLACE FUNCTION can_see_post(p_owner uuid, p_visibility text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = language_dash, pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND (
    p_owner = auth.uid()
    OR (p_visibility = 'friends'
      AND NOT has_block_between(auth.uid(), p_owner)
      AND EXISTS (SELECT 1 FROM friends f
                  WHERE f.status = 'accepted'
                    AND ((f.requester_id = auth.uid() AND f.addressee_id = p_owner)
                      OR (f.addressee_id = auth.uid() AND f.requester_id = p_owner))))
  );
$$;

CREATE OR REPLACE FUNCTION can_see_activity(p_event bigint) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = language_dash, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM activity_events e WHERE e.id = p_event AND can_see_post(e.user_id, e.visibility));
$$;

-- No more than 60 events an hour from one player.
CREATE OR REPLACE FUNCTION activity_rate_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF (SELECT count(*) FROM activity_events WHERE user_id = NEW.user_id AND created_at > now() - interval '1 hour') >= 60 THEN
    RAISE EXCEPTION 'Too many posts. Try again later.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS activity_rate_limit_trg ON activity_events;
CREATE TRIGGER activity_rate_limit_trg BEFORE INSERT ON activity_events
  FOR EACH ROW EXECUTE FUNCTION activity_rate_limit();

CREATE TABLE IF NOT EXISTS activity_kudos (
  event_id    bigint NOT NULL REFERENCES activity_events(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  emoji       text NOT NULL DEFAULT 'kudos' CHECK (emoji IN ('kudos', 'fire', 'brain', 'clap')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS activity_kudos_user_idx ON activity_kudos (user_id, created_at DESC);

-- Give (or change) kudos on a friend's post. Not on your own, not on what you cannot see.
CREATE OR REPLACE FUNCTION give_kudos(p_event bigint, p_emoji text DEFAULT 'kudos') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE owner uuid;
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT user_id INTO owner FROM activity_events WHERE id = p_event;
  IF owner IS NULL OR NOT can_see_activity(p_event) THEN RAISE EXCEPTION 'That post is not available'; END IF;
  IF owner = auth.uid() THEN RAISE EXCEPTION 'You cannot give kudos to yourself'; END IF;
  IF (SELECT count(*) FROM activity_kudos WHERE user_id = auth.uid() AND created_at > now() - interval '1 hour') >= 120 THEN
    RAISE EXCEPTION 'Slow down a little';
  END IF;
  INSERT INTO activity_kudos (event_id, user_id, emoji) VALUES (p_event, auth.uid(), coalesce(p_emoji, 'kudos'))
  ON CONFLICT (event_id, user_id) DO UPDATE SET emoji = EXCLUDED.emoji;
END;
$$;

CREATE OR REPLACE FUNCTION remove_kudos(p_event bigint) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  SELECT language_dash.require_member();
  DELETE FROM activity_kudos WHERE event_id = p_event AND user_id = auth.uid();
$$;

-- Change who can see one of your posts.
CREATE OR REPLACE FUNCTION set_activity_visibility(p_event bigint, p_visibility text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF p_visibility NOT IN ('friends', 'private') THEN RAISE EXCEPTION 'unknown visibility'; END IF;
  UPDATE activity_events SET visibility = p_visibility WHERE id = p_event AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'That post is not yours'; END IF;
END;
$$;

-- The feed: your posts and your friends' (never what a friend kept private), with kudos counts.
-- p_scope: 'all' (default), 'friends' (not mine) or 'mine'.
CREATE OR REPLACE FUNCTION get_feed(p_limit integer DEFAULT 40, p_before bigint DEFAULT NULL, p_scope text DEFAULT 'all')
RETURNS TABLE (id bigint, user_id uuid, player_name text, avatar text, kind text, payload jsonb, visibility text,
               created_at timestamptz, kudos_count bigint, i_gave text, kudos_by text[])
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = language_dash, pg_temp AS $$
  SELECT language_dash.require_member();
  SELECT e.id, e.user_id, coalesce(p.player_name, 'Player'), coalesce(p.avatar, 'avatar_intern'), e.kind, e.payload, e.visibility, e.created_at,
         (SELECT count(*) FROM activity_kudos k WHERE k.event_id = e.id),
         (SELECT k.emoji FROM activity_kudos k WHERE k.event_id = e.id AND k.user_id = auth.uid()),
         ARRAY(SELECT coalesce(kp.player_name, 'Player') FROM activity_kudos k
               LEFT JOIN player_profiles kp ON kp.user_id = k.user_id
               WHERE k.event_id = e.id ORDER BY k.created_at DESC LIMIT 3)
  FROM activity_events e
  LEFT JOIN player_profiles p ON p.user_id = e.user_id
  WHERE auth.uid() IS NOT NULL
    AND e.created_at > now() - interval '30 days'
    AND (p_before IS NULL OR e.id < p_before)
    AND can_see_activity(e.id)
    AND (CASE WHEN p_scope = 'mine' THEN e.user_id = auth.uid()
              WHEN p_scope = 'friends' THEN e.user_id <> auth.uid()
              ELSE true END)
  ORDER BY e.id DESC
  LIMIT least(greatest(coalesce(p_limit, 40), 1), 100);
$$;

-- Kudos others gave the caller recently (the "kudos you got" list).
CREATE OR REPLACE FUNCTION my_recent_kudos(p_since timestamptz DEFAULT now() - interval '7 days')
RETURNS TABLE (event_id bigint, kind text, giver_id uuid, giver_name text, emoji text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = language_dash, pg_temp AS $$
  SELECT language_dash.require_member();
  SELECT k.event_id, e.kind, k.user_id, coalesce(p.player_name, 'Player'), k.emoji, k.created_at
  FROM activity_kudos k
  JOIN activity_events e ON e.id = k.event_id AND e.user_id = auth.uid()
  LEFT JOIN player_profiles p ON p.user_id = k.user_id
  WHERE auth.uid() IS NOT NULL AND k.created_at > p_since AND NOT has_block_between(auth.uid(), k.user_id)
  ORDER BY k.created_at DESC
  LIMIT 50;
$$;


-- ==================== GROUP WEEKLY GOALS ====================
-- Members report cards studied per week; the group has one shared target.

ALTER TABLE study_groups ADD COLUMN IF NOT EXISTS weekly_goal integer
  CHECK (weekly_goal IS NULL OR weekly_goal BETWEEN 50 AND 100000);

CREATE TABLE IF NOT EXISTS weekly_study (
  user_id  uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  season   text NOT NULL CHECK (char_length(season) <= 12),
  cards    integer NOT NULL DEFAULT 0 CHECK (cards BETWEEN 0 AND 5000),
  PRIMARY KEY (user_id, season)
);

CREATE OR REPLACE FUNCTION report_study(p_season text, p_cards integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  INSERT INTO weekly_study AS w (user_id, season, cards)
  VALUES (auth.uid(), left(p_season, 12), least(greatest(coalesce(p_cards, 0), 0), 5000))
  ON CONFLICT (user_id, season) DO UPDATE SET cards = greatest(w.cards, EXCLUDED.cards);
END;
$$;

CREATE OR REPLACE FUNCTION set_group_goal(p_group_id uuid, p_goal integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  UPDATE study_groups SET weekly_goal = p_goal WHERE id = p_group_id AND owner_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Only the group owner can set the goal'; END IF;
END;
$$;

-- Progress toward the goal this week: one row per member.
CREATE OR REPLACE FUNCTION group_goal_status(p_group_id uuid, p_season text)
RETURNS TABLE (goal integer, user_id uuid, player_name text, cards integer)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF NOT is_group_member(p_group_id) THEN RAISE EXCEPTION 'not a member of this group'; END IF;
  RETURN QUERY
    SELECT g.weekly_goal, gm.user_id, coalesce(p.player_name, 'Member'), coalesce(w.cards, 0)
    FROM study_groups g
    JOIN group_members gm ON gm.group_id = g.id
    LEFT JOIN player_profiles p ON p.user_id = gm.user_id AND p.visible = true
    LEFT JOIN weekly_study w ON w.user_id = gm.user_id AND w.season = left(p_season, 12)
    WHERE g.id = p_group_id
    ORDER BY coalesce(w.cards, 0) DESC;
END;
$$;


-- ==================== REPORTS ====================

CREATE TABLE IF NOT EXISTS content_reports (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reporter_id  uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('buddy', 'group')),
  target_id    text NOT NULL CHECK (char_length(target_id) <= 40),
  reason       text NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate_name', 'other')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION report_content(p_kind text, p_target text, p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF (SELECT count(*) FROM content_reports WHERE reporter_id = auth.uid() AND created_at > now() - interval '1 day') >= 20 THEN
    RAISE EXCEPTION 'You have sent a lot of reports today';
  END IF;
  INSERT INTO content_reports (reporter_id, kind, target_id, reason) VALUES (auth.uid(), p_kind, left(p_target, 40), p_reason);
END;
$$;



-- ==================== MODERATION QUEUE ====================
-- One list of everything players have reported, newest first, for the owner to read in the Supabase table editor
-- (Table editor -> moderation_queue) or the SQL editor: SELECT * FROM moderation_queue LIMIT 50;
-- Players cannot read it. Acting on a report is done by hand (see docs/MODERATION.md).

CREATE OR REPLACE VIEW moderation_queue AS
  SELECT 'player'::text AS source, r.created_at, r.reporter_id, rp.player_name AS reporter_name,
         r.reported_id::text AS target_id, tp.player_name AS target_name, left(r.reason, 200) AS detail
  FROM user_reports r
  LEFT JOIN player_profiles rp ON rp.user_id = r.reporter_id
  LEFT JOIN player_profiles tp ON tp.user_id = r.reported_id
  UNION ALL
  SELECT 'card', c.created_at, c.reporter_id, rp.player_name, c.card_id, NULL, left(c.reason || ': ' || c.details, 200)
  FROM card_reports c
  LEFT JOIN player_profiles rp ON rp.user_id = c.reporter_id
  UNION ALL
  SELECT c.kind, c.created_at, c.reporter_id, rp.player_name, c.target_id,
         coalesce(tp.player_name, g.name), c.reason
  FROM content_reports c
  LEFT JOIN player_profiles rp ON rp.user_id = c.reporter_id
  LEFT JOIN player_profiles tp ON c.kind = 'buddy' AND tp.user_id::text = c.target_id
  LEFT JOIN study_groups g ON c.kind = 'group' AND g.id::text = c.target_id
  ORDER BY created_at DESC;


-- ==================== DIAGNOSTICS (opt-in) ====================
-- Anonymous crash and slow-frame reports, sent only by players who switch "Help fix problems" on in Settings.
-- No user id, no scores, no card or account data: a short message, where it happened, the app version and the
-- graphics tier. The table cannot be read by players; a global cap keeps it from being flooded.

CREATE TABLE IF NOT EXISTS client_diagnostics (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind        text NOT NULL CHECK (kind IN ('error', 'perf')),
  message     text NOT NULL CHECK (char_length(message) <= 300),
  system      text CHECK (char_length(system) <= 40),
  operation   text CHECK (char_length(operation) <= 40),
  version     text CHECK (char_length(version) <= 20),
  tier        text CHECK (tier IN ('low', 'medium', 'high')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION report_diagnostic(p_kind text, p_message text, p_system text DEFAULT NULL, p_operation text DEFAULT NULL,
                                             p_version text DEFAULT NULL, p_tier text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  -- one cap for everyone, so a script cannot fill the table
  IF (SELECT count(*) FROM client_diagnostics WHERE created_at > now() - interval '1 hour') >= 500 THEN RETURN; END IF;
  INSERT INTO client_diagnostics (kind, message, system, operation, version, tier)
  VALUES (p_kind, left(coalesce(p_message, ''), 300), left(p_system, 40), left(p_operation, 40), left(p_version, 20),
          CASE WHEN p_tier IN ('low', 'medium', 'high') THEN p_tier END);
END;
$$;


-- ==================== PLAYER FEEDBACK ====================
-- "Are you enjoying Language Dash?" -> "Not really" lands here, as does Settings -> Send feedback. The owner reads the
-- inbox in the Supabase table editor (feedback_inbox) or: SELECT * FROM feedback_inbox LIMIT 50;
-- Players can send but never read; five a day per player.

CREATE TABLE IF NOT EXISTS app_feedback (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  mood        text NOT NULL CHECK (mood IN ('unhappy', 'idea', 'bug')),
  message     text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  contact     text CHECK (char_length(contact) <= 120),
  version     text CHECK (char_length(version) <= 20),
  platform    text CHECK (platform IN ('android', 'ios', 'web')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION submit_feedback(p_mood text, p_message text, p_contact text DEFAULT NULL,
                                           p_version text DEFAULT NULL, p_platform text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF coalesce(btrim(p_message), '') = '' THEN RAISE EXCEPTION 'Please write a few words first'; END IF;
  IF (SELECT count(*) FROM app_feedback WHERE user_id = auth.uid() AND created_at > now() - interval '1 day') >= 5 THEN
    RAISE EXCEPTION 'You have sent a lot of feedback today. Thank you! Please try again tomorrow';
  END IF;
  INSERT INTO app_feedback (user_id, mood, message, contact, version, platform)
  VALUES (auth.uid(), CASE WHEN p_mood IN ('unhappy', 'idea', 'bug') THEN p_mood ELSE 'unhappy' END,
          left(btrim(p_message), 1000), nullif(left(btrim(coalesce(p_contact, '')), 120), ''), left(p_version, 20),
          CASE WHEN p_platform IN ('android', 'ios', 'web') THEN p_platform END);
END;
$$;

CREATE OR REPLACE VIEW feedback_inbox AS
  SELECT f.created_at, f.mood, f.message, f.contact, f.platform, f.version, p.player_name
  FROM app_feedback f
  LEFT JOIN player_profiles p ON p.user_id = f.user_id
  ORDER BY f.created_at DESC;


-- ==================== CLOUD SAVES ====================
-- One private save per account, so progress follows the player across devices.
-- Written only through push_save(), which refuses to overwrite a newer save
-- from another device unless the caller passes that save's timestamp.

CREATE TABLE IF NOT EXISTS player_saves (
  user_id     uuid PRIMARY KEY REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  data        jsonb NOT NULL,
  run_count   integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- The richest save an account has ever had. Whenever a save is replaced, the old one is kept here if it had more play
-- in it than the backup (or if the new one has less), so a stale or empty device can never destroy real progress.
CREATE TABLE IF NOT EXISTS player_saves_backup (
  user_id     uuid PRIMARY KEY REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  data        jsonb NOT NULL,
  run_count   integer NOT NULL DEFAULT 0,
  saved_at    timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE OR REPLACE FUNCTION keep_richest_save(p_uid uuid, p_new_runs integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = language_dash, pg_temp
AS $$
BEGIN
  INSERT INTO player_saves_backup (user_id, data, run_count, saved_at)
  SELECT s.user_id, s.data, s.run_count, clock_timestamp()
  FROM player_saves s
  WHERE s.user_id = p_uid
    AND s.run_count > 0
    -- only ever replace the backup with something at least as big: a smaller save written over a smaller save must not
    -- push out the biggest one
    AND s.run_count >= coalesce((SELECT b.run_count FROM player_saves_backup b WHERE b.user_id = p_uid), 0)
  ON CONFLICT (user_id) DO UPDATE
    SET data = excluded.data, run_count = excluded.run_count, saved_at = excluded.saved_at;
END;
$$;

-- Put the kept save back as the live one (owner only). Returns the restored save's time, or NULL when there is none.
CREATE OR REPLACE FUNCTION restore_backup_save()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = language_dash, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  b player_saves_backup%ROWTYPE;
  new_ts timestamptz := clock_timestamp();
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO b FROM player_saves_backup WHERE user_id = uid;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  PERFORM keep_richest_save(uid, b.run_count);
  INSERT INTO player_saves (user_id, data, run_count, updated_at)
  VALUES (uid, b.data, b.run_count, new_ts)
  ON CONFLICT (user_id) DO UPDATE
    SET data = excluded.data, run_count = excluded.run_count, updated_at = excluded.updated_at;
  RETURN new_ts;
END;
$$;

CREATE OR REPLACE FUNCTION push_save(p_data jsonb, p_run_count integer, p_base timestamptz)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = language_dash, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  current_ts timestamptz;
  new_ts timestamptz := clock_timestamp();
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF pg_column_size(p_data) > 3000000 THEN
    RAISE EXCEPTION 'Save is too large';
  END IF;

  SELECT updated_at INTO current_ts FROM player_saves WHERE user_id = uid FOR UPDATE;

  IF FOUND THEN
    -- Someone else (another device) saved since the caller last synced.
    IF p_base IS NULL OR current_ts <> p_base THEN
      RETURN NULL;
    END IF;
    PERFORM keep_richest_save(uid, greatest(p_run_count, 0));
    UPDATE player_saves SET data = p_data, run_count = greatest(p_run_count, 0), updated_at = new_ts
    WHERE user_id = uid;
  ELSE
    IF p_base IS NOT NULL THEN
      -- The caller believed a save existed but it is gone; treat as a new save.
      NULL;
    END IF;
    INSERT INTO player_saves (user_id, data, run_count, updated_at)
    VALUES (uid, p_data, greatest(p_run_count, 0), new_ts);
  END IF;

  RETURN new_ts;
END;
$$;

-- Force an overwrite (the player chose "keep this device").
CREATE OR REPLACE FUNCTION force_save(p_data jsonb, p_run_count integer)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = language_dash, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  new_ts timestamptz := clock_timestamp();
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF pg_column_size(p_data) > 3000000 THEN
    RAISE EXCEPTION 'Save is too large';
  END IF;
  PERFORM keep_richest_save(uid, greatest(p_run_count, 0));
  INSERT INTO player_saves (user_id, data, run_count, updated_at)
  VALUES (uid, p_data, greatest(p_run_count, 0), new_ts)
  ON CONFLICT (user_id) DO UPDATE
    SET data = excluded.data, run_count = excluded.run_count, updated_at = excluded.updated_at;
  RETURN new_ts;
END;
$$;-- (delete_my_account() is NOT carried over: deleted auth.users (the shared sign-in). Replaced by language_dash.delete_my_ld_data(), which only removes Language Dash data.)



-- ==================== RANKED MULTIPLAYER ====================
-- Trophies and leagues for matches against random players.
--
--   player_trophies   one row per player: trophies, wins, losses.
--   ranked_queue      players waiting for an opponent (each holds a PeerJS room).
--   ranked_matches    a pairing. Both players then play peer to peer.
--   ranked_reports    what each player says happened. Trophies change only when
--                     the two reports agree (or one player concedes, or one
--                     report stands unanswered for 90 seconds AND was filed
--                     after the match could actually have been played: a
--                     ranked round runs a 90 second clock that cannot start
--                     until the pairing exists, so a win or draw claim filed
--                     within 100 seconds of the pairing is not evidence of
--                     play and can never settle the match on its own).
--
-- Players never write these tables directly; they call the functions below.
-- The trophy formula is the same as js/leagues.js (trophyDelta).

CREATE TABLE IF NOT EXISTS player_trophies (
  user_id       uuid PRIMARY KEY REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  trophies      integer NOT NULL DEFAULT 0 CHECK (trophies >= 0),
  best_trophies integer NOT NULL DEFAULT 0 CHECK (best_trophies >= 0),
  wins          integer NOT NULL DEFAULT 0 CHECK (wins >= 0),
  losses        integer NOT NULL DEFAULT 0 CHECK (losses >= 0),
  draws         integer NOT NULL DEFAULT 0 CHECK (draws >= 0),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS player_trophies_rank_idx ON player_trophies (trophies DESC);

CREATE TABLE IF NOT EXISTS ranked_queue (
  user_id   uuid PRIMARY KEY REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  room_code text NOT NULL CHECK (room_code ~ '^[A-Z0-9]{5}$'),
  trophies  integer NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  seen_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ranked_matches (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id        uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  guest_id       uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  room_code      text NOT NULL,
  host_trophies  integer NOT NULL,
  guest_trophies integer NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  settled        boolean NOT NULL DEFAULT false,
  winner_id      uuid,
  CHECK (host_id <> guest_id)
);
CREATE INDEX IF NOT EXISTS ranked_matches_host_idx ON ranked_matches (host_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ranked_reports (
  match_id    uuid NOT NULL REFERENCES ranked_matches(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  outcome     text NOT NULL CHECK (outcome IN ('win', 'loss', 'draw')),
  reported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);

-- The first trophy count of the player's current league: nobody drops below it.
CREATE OR REPLACE FUNCTION ranked_league_floor(t integer) RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = language_dash, pg_temp
AS $$
  SELECT CASE
    WHEN t >= 3600 THEN 3600 WHEN t >= 2700 THEN 2700 WHEN t >= 1900 THEN 1900
    WHEN t >= 1200 THEN 1200 WHEN t >= 700 THEN 700 WHEN t >= 300 THEN 300 ELSE 0 END;
$$;

-- Trophy change for one player (see trophyDelta in js/leagues.js).
CREATE OR REPLACE FUNCTION ranked_delta(mine integer, theirs integer, outcome text) RETURNS integer
LANGUAGE plpgsql IMMUTABLE SET search_path = language_dash, pg_temp
AS $$
DECLARE
  expected numeric := 1 / (1 + power(10::numeric, (theirs - mine) / 400.0));
  delta integer;
BEGIN
  IF outcome = 'draw' THEN RETURN 0; END IF;
  IF outcome = 'win' THEN
    delta := greatest(10, round(40 * (1 - expected))::integer);
  ELSE
    delta := -greatest(8, round(40 * expected)::integer);
  END IF;
  IF mine + delta < ranked_league_floor(mine) THEN
    delta := ranked_league_floor(mine) - mine;
  END IF;
  RETURN delta;
END;
$$;

-- Give one player their trophy change for a finished match.
CREATE OR REPLACE FUNCTION ranked_apply(p_user uuid, p_mine integer, p_theirs integer, p_outcome text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  cur integer;
  d integer := ranked_delta(p_mine, p_theirs, p_outcome);
  nxt integer;
BEGIN
  INSERT INTO player_trophies (user_id) VALUES (p_user) ON CONFLICT DO NOTHING;
  SELECT trophies INTO cur FROM player_trophies WHERE user_id = p_user FOR UPDATE;
  nxt := greatest(cur + d, ranked_league_floor(cur));
  UPDATE player_trophies SET
    trophies = nxt,
    best_trophies = greatest(best_trophies, nxt),
    wins = wins + (CASE WHEN p_outcome = 'win' THEN 1 ELSE 0 END),
    losses = losses + (CASE WHEN p_outcome = 'loss' THEN 1 ELSE 0 END),
    draws = draws + (CASE WHEN p_outcome = 'draw' THEN 1 ELSE 0 END),
    updated_at = now()
  WHERE user_id = p_user;
  RETURN nxt - cur;
END;
$$;
REVOKE ALL ON FUNCTION ranked_apply(uuid, integer, integer, text) FROM PUBLIC, anon, authenticated;

-- Settle a match if its reports allow it. Returns true when the match is now settled.
CREATE OR REPLACE FUNCTION ranked_try_settle(p_match uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  m ranked_matches;
  hr ranked_reports;
  gr ranked_reports;
  host_out text;
  guest_out text;
BEGIN
  SELECT * INTO m FROM ranked_matches WHERE id = p_match FOR UPDATE;
  IF NOT FOUND OR m.settled THEN RETURN COALESCE(m.settled, false); END IF;
  SELECT * INTO hr FROM ranked_reports WHERE match_id = p_match AND user_id = m.host_id;
  SELECT * INTO gr FROM ranked_reports WHERE match_id = p_match AND user_id = m.guest_id;

  IF hr.user_id IS NOT NULL AND gr.user_id IS NOT NULL THEN
    IF hr.outcome = 'win' AND gr.outcome = 'loss' THEN host_out := 'win'; guest_out := 'loss';
    ELSIF hr.outcome = 'loss' AND gr.outcome = 'win' THEN host_out := 'loss'; guest_out := 'win';
    ELSIF hr.outcome = 'draw' AND gr.outcome = 'draw' THEN host_out := 'draw'; guest_out := 'draw';
    ELSE
      -- the two stories do not match: nobody gains or loses anything
      UPDATE ranked_matches SET settled = true WHERE id = p_match;
      RETURN true;
    END IF;
  ELSIF hr.user_id IS NOT NULL THEN
    IF hr.outcome = 'loss' THEN host_out := 'loss'; guest_out := 'win';
    ELSIF hr.reported_at < now() - interval '90 seconds'
      AND hr.reported_at >= m.created_at + interval '100 seconds' THEN
      -- (the report is old enough to be unanswered, and the match is old enough to have been played:
      --  the 90 second round cannot start until the pairing exists, the peers connect and the host's
      --  start time arrives, so a claim filed sooner describes a match that never happened)
      IF hr.outcome = 'win' THEN host_out := 'win'; guest_out := 'loss'; ELSE host_out := 'draw'; guest_out := 'draw'; END IF;
    ELSE RETURN false; END IF;
  ELSIF gr.user_id IS NOT NULL THEN
    IF gr.outcome = 'loss' THEN guest_out := 'loss'; host_out := 'win';
    ELSIF gr.reported_at < now() - interval '90 seconds'
      AND gr.reported_at >= m.created_at + interval '100 seconds' THEN
      IF gr.outcome = 'win' THEN guest_out := 'win'; host_out := 'loss'; ELSE guest_out := 'draw'; host_out := 'draw'; END IF;
    ELSE RETURN false; END IF;
  ELSE
    RETURN false;
  END IF;

  PERFORM ranked_apply(m.host_id, m.host_trophies, m.guest_trophies, host_out);
  PERFORM ranked_apply(m.guest_id, m.guest_trophies, m.host_trophies, guest_out);
  UPDATE ranked_matches SET settled = true,
    winner_id = CASE WHEN host_out = 'win' THEN m.host_id WHEN guest_out = 'win' THEN m.guest_id ELSE NULL END
  WHERE id = p_match;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION ranked_try_settle(uuid) FROM PUBLIC, anon, authenticated;

-- Join the queue with a PeerJS room you have just opened. Returns either
--   {role:'guest', match_id, room_code, ...}  an opponent was waiting: join their room, or
--   {role:'host', ...}                         nobody yet: keep your room open and call ranked_poll_match.
CREATE OR REPLACE FUNCTION ranked_find_match(p_room_code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  me uuid := auth.uid();
  code text := upper(p_room_code);
  my_t integer;
  cand ranked_queue;
  m ranked_matches;
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF code !~ '^[A-Z0-9]{5}$' THEN RAISE EXCEPTION 'Bad room code'; END IF;
  INSERT INTO player_trophies (user_id) VALUES (me) ON CONFLICT DO NOTHING;
  SELECT trophies INTO my_t FROM player_trophies WHERE user_id = me;
  DELETE FROM ranked_queue WHERE user_id = me;

  -- a waiting player of similar strength; the window widens 10 trophies per second waited
  SELECT * INTO cand FROM ranked_queue q
   WHERE q.user_id <> me
     AND q.seen_at > now() - interval '15 seconds'
     AND abs(q.trophies - my_t) <= 150 + 10 * extract(epoch FROM (now() - q.joined_at))::integer
   ORDER BY q.joined_at
   LIMIT 1
   FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    DELETE FROM ranked_queue WHERE user_id = cand.user_id;
    INSERT INTO ranked_matches (host_id, guest_id, room_code, host_trophies, guest_trophies)
    VALUES (cand.user_id, me, cand.room_code, cand.trophies, my_t)
    RETURNING * INTO m;
    RETURN jsonb_build_object('role', 'guest', 'match_id', m.id, 'room_code', m.room_code,
                              'own_trophies', my_t, 'opponent_trophies', cand.trophies);
  END IF;

  INSERT INTO ranked_queue (user_id, room_code, trophies) VALUES (me, code, my_t);
  RETURN jsonb_build_object('role', 'host', 'own_trophies', my_t);
END;
$$;

-- The host calls this every few seconds while waiting. It keeps the queue entry
-- alive and reports when someone has been paired with the room.
CREATE OR REPLACE FUNCTION ranked_poll_match() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  me uuid := auth.uid();
  m ranked_matches;
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO m FROM ranked_matches
   WHERE host_id = me AND NOT settled AND created_at > now() - interval '2 minutes'
     AND NOT EXISTS (SELECT 1 FROM ranked_reports r WHERE r.match_id = ranked_matches.id)
   ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('matched', true, 'match_id', m.id, 'room_code', m.room_code,
                              'own_trophies', m.host_trophies, 'opponent_trophies', m.guest_trophies);
  END IF;
  UPDATE ranked_queue SET seen_at = now() WHERE user_id = me;
  RETURN jsonb_build_object('matched', false, 'waiting', FOUND OR EXISTS (SELECT 1 FROM ranked_queue WHERE user_id = me));
END;
$$;

CREATE OR REPLACE FUNCTION ranked_cancel() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  SELECT language_dash.require_member();
  DELETE FROM ranked_queue WHERE user_id = auth.uid();
$$;

-- Say how a match ended for you. Trophies change once the story is settled.
-- Returns {settled, delta, trophies}.
CREATE OR REPLACE FUNCTION ranked_report(p_match uuid, p_outcome text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  me uuid := auth.uid();
  m ranked_matches;
  before_t integer;
  done boolean;
  after_t integer;
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF p_outcome NOT IN ('win', 'loss', 'draw') THEN RAISE EXCEPTION 'Bad outcome'; END IF;
  SELECT * INTO m FROM ranked_matches WHERE id = p_match;
  IF NOT FOUND OR me NOT IN (m.host_id, m.guest_id) THEN RAISE EXCEPTION 'Not your match'; END IF;
  INSERT INTO player_trophies (user_id) VALUES (me) ON CONFLICT DO NOTHING;
  SELECT trophies INTO before_t FROM player_trophies WHERE user_id = me;
  IF m.settled THEN
    RETURN jsonb_build_object('settled', true, 'delta', 0, 'trophies', before_t);
  END IF;
  INSERT INTO ranked_reports (match_id, user_id, outcome) VALUES (p_match, me, p_outcome) ON CONFLICT DO NOTHING;
  done := ranked_try_settle(p_match);
  SELECT trophies INTO after_t FROM player_trophies WHERE user_id = me;
  RETURN jsonb_build_object('settled', done, 'delta', after_t - before_t, 'trophies', after_t);
END;
$$;

-- Settle matches where one side reported and the other never did (they left).
CREATE OR REPLACE FUNCTION ranked_settle_stale() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  FOR r IN
    SELECT m.id FROM ranked_matches m
     WHERE NOT m.settled AND m.created_at > now() - interval '1 day'
       AND EXISTS (SELECT 1 FROM ranked_reports x WHERE x.match_id = m.id AND x.reported_at < now() - interval '90 seconds')
     LIMIT 50
  LOOP
    IF ranked_try_settle(r.id) THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END;
$$;

-- My own trophies (creates the row on first use).
CREATE OR REPLACE FUNCTION ranked_my_stats() RETURNS player_trophies
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  me uuid := auth.uid();
  t player_trophies;
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  INSERT INTO player_trophies (user_id) VALUES (me) ON CONFLICT DO NOTHING;
  SELECT * INTO t FROM player_trophies WHERE user_id = me;
  RETURN t;
END;
$$;

-- The top players by trophies.
CREATE OR REPLACE FUNCTION ranked_top(p_limit integer DEFAULT 50)
RETURNS TABLE (user_id uuid, player_name text, avatar text, trophies integer, wins integer, losses integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  SELECT language_dash.require_member();
  SELECT t.user_id, coalesce(p.player_name, 'Anonymous'), coalesce(p.avatar, 'avatar_intern'),
         t.trophies, t.wins, t.losses
    FROM player_trophies t LEFT JOIN player_profiles p ON p.user_id = t.user_id
   WHERE t.wins + t.losses + t.draws > 0 AND coalesce(p.visible, true)
   ORDER BY t.trophies DESC, t.wins DESC
   LIMIT least(greatest(p_limit, 1), 100);
$$;

-- ==================== REALTIME ====================
-- Lets the app receive match invites instantly.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE language_dash.match_invites;
EXCEPTION WHEN duplicate_object OR undefined_object THEN
  NULL;
END $$;

-- ==================== WHO MAY CALL THE INTERNAL FUNCTIONS ====================
-- Supabase gives every new function to the signed-in and signed-out roles by default, and "REVOKE ... FROM PUBLIC" does
-- not take that away. Anything below is called only by triggers or by other functions that run as the owner, never by
-- the app, so the app roles must not be able to call it directly.
REVOKE ALL ON FUNCTION scores_sanity(), scores_keep_best(), activity_rate_limit(),
  ranked_league_floor(integer), ranked_delta(integer, integer, text), ranked_apply(uuid, integer, integer, text),
  ranked_try_settle(uuid), keep_richest_save(uuid, integer) FROM PUBLIC, anon, authenticated;
-- Helpers the row-security rules call while a signed-in player reads: signed-in only
REVOKE ALL ON FUNCTION has_block_between(uuid, uuid), is_group_member(uuid), can_see_post(uuid, text), can_see_activity(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION has_block_between(uuid, uuid), is_group_member(uuid), can_see_post(uuid, text), can_see_activity(bigint) TO authenticated;

-- ===================================================================================================================
-- from database/policies.sql
-- ===================================================================================================================

-- ================================================================
-- Language Dash — Row Level Security Policies
-- Version: 2.0.0
--
-- All tables use RLS. Writes require authentication via auth.uid().
-- Anonymous/public writes are prohibited per ARCHITECTURE.md §27.6.
-- ================================================================

-- ==================== ENABLE RLS ====================

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_reports ENABLE ROW LEVEL SECURITY;


-- ==================== SCORES POLICIES ====================

-- Anyone can read scores (leaderboard is public).
DROP POLICY IF EXISTS "scores_select_public" ON scores;
CREATE POLICY "scores_select_public"
  ON scores FOR SELECT
  USING (true);

-- Authenticated users can insert their own scores.
DROP POLICY IF EXISTS "scores_insert_own" ON scores;
CREATE POLICY "scores_insert_own"
  ON scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users cannot update or delete scores once submitted.
-- (No UPDATE or DELETE policies = forbidden by default with RLS.)


-- ==================== PLAYER PROFILES POLICIES ====================

-- Public profiles are readable by anyone.
-- Own profile is always readable.
DROP POLICY IF EXISTS "profiles_select" ON player_profiles;
CREATE POLICY "profiles_select"
  ON player_profiles FOR SELECT
  USING (visible = true OR auth.uid() = user_id);

-- Users can insert their own profile.
DROP POLICY IF EXISTS "profiles_insert_own" ON player_profiles;
CREATE POLICY "profiles_insert_own"
  ON player_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update only their own profile.
DROP POLICY IF EXISTS "profiles_update_own" ON player_profiles;
CREATE POLICY "profiles_update_own"
  ON player_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ==================== FRIENDS POLICIES ====================

-- Users can see friend rows where they are either party.
DROP POLICY IF EXISTS "friends_select_own" ON friends;
CREATE POLICY "friends_select_own"
  ON friends FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can send friend requests (as requester).
DROP POLICY IF EXISTS "friends_insert_own" ON friends;
CREATE POLICY "friends_insert_own"
  ON friends FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id
    AND status = 'pending'
    AND NOT has_block_between(auth.uid(), addressee_id)
  );

-- Only the addressee can update status (accept/decline).
DROP POLICY IF EXISTS "friends_update_addressee" ON friends;
CREATE POLICY "friends_update_addressee"
  ON friends FOR UPDATE
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);

-- Either party can delete a friendship (unfriend).
DROP POLICY IF EXISTS "friends_delete_own" ON friends;
CREATE POLICY "friends_delete_own"
  ON friends FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);


-- ==================== FRIEND BLOCKS POLICIES ====================

-- Users can see their own blocks.
DROP POLICY IF EXISTS "blocks_select_own" ON friend_blocks;
CREATE POLICY "blocks_select_own"
  ON friend_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

-- Users can block others.
DROP POLICY IF EXISTS "blocks_insert_own" ON friend_blocks;
CREATE POLICY "blocks_insert_own"
  ON friend_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

-- Users can unblock others.
DROP POLICY IF EXISTS "blocks_delete_own" ON friend_blocks;
CREATE POLICY "blocks_delete_own"
  ON friend_blocks FOR DELETE
  USING (auth.uid() = blocker_id);


-- ==================== MATCH INVITES POLICIES ====================

-- Users can see invites sent to or from them.
DROP POLICY IF EXISTS "invites_select_own" ON match_invites;
CREATE POLICY "invites_select_own"
  ON match_invites FOR SELECT
  USING (auth.uid() = from_user OR auth.uid() = to_user);

-- Users can create invites they send.
DROP POLICY IF EXISTS "invites_insert_own" ON match_invites;
CREATE POLICY "invites_insert_own"
  ON match_invites FOR INSERT
  WITH CHECK (
    auth.uid() = from_user
    AND EXISTS (
      SELECT 1 FROM friends f
      WHERE f.status = 'accepted'
        AND ((f.requester_id = auth.uid() AND f.addressee_id = to_user)
          OR (f.addressee_id = auth.uid() AND f.requester_id = to_user))
    )
  );

-- Sender can update status to 'cancelled'.
-- Recipient can update status to 'accepted' or 'declined'.
DROP POLICY IF EXISTS "invites_update_own" ON match_invites;
CREATE POLICY "invites_update_own"
  ON match_invites FOR UPDATE
  USING (auth.uid() = from_user OR auth.uid() = to_user)
  WITH CHECK (
    (auth.uid() = from_user AND status = 'cancelled') OR
    (auth.uid() = to_user AND status IN ('accepted', 'declined'))
  );


-- ==================== USER REPORTS POLICIES ====================

-- Users can see their own reports.
DROP POLICY IF EXISTS "reports_select_own" ON user_reports;
CREATE POLICY "reports_select_own"
  ON user_reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Authenticated users can submit reports.
DROP POLICY IF EXISTS "reports_insert_own" ON user_reports;
CREATE POLICY "reports_insert_own"
  ON user_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Reports cannot be updated or deleted by users.
-- (Admin review handled separately outside RLS.)


-- ==================== CARD REPORTS POLICIES ====================

DROP POLICY IF EXISTS "card_reports_select_own" ON card_reports;
CREATE POLICY "card_reports_select_own"
  ON card_reports FOR SELECT
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "card_reports_insert_own" ON card_reports;
CREATE POLICY "card_reports_insert_own"
  ON card_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);


-- ==================== GRANT USAGE TO SERVICE ROLE ====================
-- The upsert_player_profile function runs as SECURITY DEFINER
-- so it can enforce GREATEST logic on profile bests.
-- The anon and authenticated roles call it via RPC.

GRANT EXECUTE ON FUNCTION upsert_player_profile(uuid, text, text, text[], integer, integer, boolean)
  TO authenticated;


-- ==================== STUDY GROUPS / DECKS ====================
-- Group and deck writes happen only through the SECURITY DEFINER functions in
-- schema.sql, so no INSERT/UPDATE/DELETE policies are defined for these tables.

ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_decks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_groups_select_member" ON study_groups;
CREATE POLICY "study_groups_select_member"
  ON study_groups FOR SELECT
  USING (is_group_member(id) OR owner_id = auth.uid());

DROP POLICY IF EXISTS "group_members_select_member" ON group_members;
CREATE POLICY "group_members_select_member"
  ON group_members FOR SELECT
  USING (is_group_member(group_id));

DROP POLICY IF EXISTS "shared_decks_select_own" ON shared_decks;
CREATE POLICY "shared_decks_select_own"
  ON shared_decks FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "shared_decks_delete_own" ON shared_decks;
CREATE POLICY "shared_decks_delete_own"
  ON shared_decks FOR DELETE
  USING (owner_id = auth.uid());

GRANT EXECUTE ON FUNCTION has_block_between(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_group(text) TO authenticated;
GRANT EXECUTE ON FUNCTION join_group(text) TO authenticated;
GRANT EXECUTE ON FUNCTION leave_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION my_groups() TO authenticated;
GRANT EXECUTE ON FUNCTION group_leaderboard(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION publish_deck(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION get_shared_deck(text) TO authenticated;


-- ==================== ACTIVITY FEED / GROUP GOALS ====================

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_study ENABLE ROW LEVEL SECURITY;

-- What a friend kept private is not readable by anyone else, and a block hides posts both ways.
DROP POLICY IF EXISTS "activity_select_self_or_friend" ON activity_events;
CREATE POLICY "activity_select_self_or_friend"
  ON activity_events FOR SELECT
  USING (can_see_post(user_id, visibility));

DROP POLICY IF EXISTS "activity_insert_own" ON activity_events;
CREATE POLICY "activity_insert_own"
  ON activity_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "activity_delete_own" ON activity_events;
CREATE POLICY "activity_delete_own"
  ON activity_events FOR DELETE
  USING (user_id = auth.uid());

ALTER TABLE activity_kudos ENABLE ROW LEVEL SECURITY;
-- Kudos are written and read only through give_kudos / remove_kudos / get_feed / my_recent_kudos.
REVOKE ALL ON activity_kudos FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION can_see_post(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION can_see_activity(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION give_kudos(bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_kudos(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION set_activity_visibility(bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_feed(integer, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION my_recent_kudos(timestamptz) TO authenticated;

-- weekly_study is written only through report_study() and read through
-- group_goal_status(), so it has no direct policies.

GRANT EXECUTE ON FUNCTION season_standing(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION report_study(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION set_group_goal(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION group_goal_status(uuid, text) TO authenticated;


-- ==================== REPORTS AND MODERATION ====================

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON content_reports FROM PUBLIC, anon, authenticated;
REVOKE ALL ON moderation_queue FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION report_content(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION report_content(text, text, text) TO authenticated;


-- ==================== DIAGNOSTICS ====================

ALTER TABLE client_diagnostics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON client_diagnostics FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION report_diagnostic(text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION report_diagnostic(text, text, text, text, text, text) TO authenticated;


-- ==================== PLAYER FEEDBACK ====================

ALTER TABLE app_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_feedback FROM PUBLIC, anon, authenticated;
REVOKE ALL ON feedback_inbox FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION submit_feedback(text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_feedback(text, text, text, text, text) TO authenticated;


-- ==================== CLOUD SAVES ====================
-- A save is private to its owner. Writes go through push_save()/force_save().

ALTER TABLE player_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saves_select_own" ON player_saves;
CREATE POLICY "saves_select_own"
  ON player_saves FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "saves_delete_own" ON player_saves;
CREATE POLICY "saves_delete_own"
  ON player_saves FOR DELETE
  USING (user_id = auth.uid());

REVOKE INSERT, UPDATE ON player_saves FROM authenticated;
GRANT EXECUTE ON FUNCTION push_save(jsonb, integer, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION force_save(jsonb, integer) TO authenticated;

-- The kept richest save is only reachable through restore_backup_save().
ALTER TABLE player_saves_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON player_saves_backup FROM anon, authenticated;
REVOKE ALL ON FUNCTION keep_richest_save(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION restore_backup_save() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION restore_backup_save() TO authenticated;


-- ==================== RANKED MULTIPLAYER ====================
-- Nobody reads or writes these tables directly; the functions in schema.sql do.

ALTER TABLE player_trophies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranked_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranked_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranked_reports ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON player_trophies, ranked_queue, ranked_matches, ranked_reports FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION ranked_find_match(text), ranked_poll_match(), ranked_cancel(), ranked_report(uuid, text),
  ranked_settle_stale(), ranked_my_stats(), ranked_top(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ranked_find_match(text) TO authenticated;
GRANT EXECUTE ON FUNCTION ranked_poll_match() TO authenticated;
GRANT EXECUTE ON FUNCTION ranked_cancel() TO authenticated;
GRANT EXECUTE ON FUNCTION ranked_report(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION ranked_settle_stale() TO authenticated;
GRANT EXECUTE ON FUNCTION ranked_my_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION ranked_top(integer) TO authenticated;

-- ==================== WHAT A SIGNED-IN PLAYER MAY CHANGE ====================
-- Row security says WHICH rows; these say WHICH COLUMNS. Without them the person who was asked to be a friend could
-- rewrite who the friendship is between (making a stranger their "friend" without that stranger agreeing), and anyone
-- could write their own profile's best score directly instead of through upsert_player_profile.
REVOKE UPDATE ON friends, match_invites FROM anon, authenticated;
GRANT UPDATE (status) ON friends, match_invites TO authenticated;
REVOKE INSERT, UPDATE ON player_profiles FROM anon, authenticated;
REVOKE DELETE ON player_saves FROM anon, authenticated; -- a cloud save is never deleted from the app (a bug or a hostile page could wipe it); the account deletion removes it

-- ===================================================================================================================
-- from database/cohorts.sql
-- ===================================================================================================================

-- ================================================================
-- Language Dash — Cohorts and cohort wars (NOT RELEASED YET)
--
-- Cohorts are teams of up to 50 players (a class, a study group, a whole
-- school year) that climb a weekly "war" ladder together. Schools are a tag on
-- a cohort, so schools can be ranked against each other.
--
-- This file is optional and the game does not show cohorts until the build
-- flag VITE_FEATURE_COHORTS=1 is set (see docs/COHORTS.md). Run it in the
-- Supabase SQL editor AFTER schema.sql and policies.sql, when there are
-- enough players for cohorts to be fun. It is safe to run twice.
--
-- How the war works:
--   * Each ISO week is one war. A ranked-match win scores 10 points for the
--     winner's cohort, a draw 3. One player can bring in at most 100 points
--     per week, so one grinder cannot carry a cohort.
--   * Cohort standing = war points this week. School standing = the war points
--     of all that school's cohorts.
--   * "Trophies" of a cohort = the sum of its members' ranked trophies.
-- ================================================================

-- ==================== TABLES ====================

CREATE TABLE IF NOT EXISTS schools (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  created_by uuid REFERENCES language_dash.members(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS schools_name_idx ON schools (lower(name));

CREATE TABLE IF NOT EXISTS cohorts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 30),
  tag         text NOT NULL UNIQUE CHECK (tag ~ '^[A-Z0-9]{5}$'),
  school_id   uuid REFERENCES schools(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 140),
  join_mode   text NOT NULL DEFAULT 'open' CHECK (join_mode IN ('open', 'invite')),
  max_members integer NOT NULL DEFAULT 50 CHECK (max_members BETWEEN 2 AND 50),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cohorts_name_idx ON cohorts (lower(name));
CREATE INDEX IF NOT EXISTS cohorts_school_idx ON cohorts (school_id);

-- One cohort per player.
CREATE TABLE IF NOT EXISTS cohort_members (
  cohort_id uuid NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL UNIQUE REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  role      text NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'officer', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cohort_id, user_id)
);
CREATE INDEX IF NOT EXISTS cohort_members_cohort_idx ON cohort_members (cohort_id);

CREATE TABLE IF NOT EXISTS cohort_war_points (
  week       text NOT NULL,
  cohort_id  uuid NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  points     integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (week, cohort_id, user_id)
);
CREATE INDEX IF NOT EXISTS cohort_war_week_idx ON cohort_war_points (week, cohort_id);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_war_points ENABLE ROW LEVEL SECURITY;

-- Everything goes through the functions below.
REVOKE ALL ON schools, cohorts, cohort_members, cohort_war_points FROM PUBLIC, anon, authenticated;

-- ==================== HELPERS ====================

CREATE OR REPLACE FUNCTION cohort_week(ts timestamptz DEFAULT now()) RETURNS text
LANGUAGE sql STABLE SET search_path = language_dash, pg_temp
AS $$ SELECT to_char(ts, 'IYYY-"W"IW') $$;

CREATE OR REPLACE FUNCTION cohort_random_tag() RETURNS text
LANGUAGE plpgsql VOLATILE SET search_path = language_dash, pg_temp
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  t text;
BEGIN
  LOOP
    t := '';
    FOR i IN 1..5 LOOP
      t := t || substr(chars, 1 + floor(random() * length(chars))::integer, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM cohorts WHERE tag = t);
  END LOOP;
  RETURN t;
END;
$$;

CREATE OR REPLACE FUNCTION cohort_role_of(p_cohort uuid, p_user uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  SELECT role FROM cohort_members WHERE cohort_id = p_cohort AND user_id = p_user
$$;

-- ==================== MEMBERSHIP ====================

-- Start a cohort (and its school, if it is new). You become its leader.
CREATE OR REPLACE FUNCTION cohort_create(p_name text, p_school text DEFAULT NULL, p_description text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  me uuid := auth.uid();
  sid uuid;
  c cohorts;
  school_name text := nullif(btrim(regexp_replace(coalesce(p_school, ''), '\s+', ' ', 'g')), '');
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF EXISTS (SELECT 1 FROM cohort_members WHERE user_id = me) THEN
    RAISE EXCEPTION 'Leave your current cohort first';
  END IF;
  IF school_name IS NOT NULL THEN
    SELECT id INTO sid FROM schools WHERE lower(name) = lower(school_name);
    IF sid IS NULL THEN
      INSERT INTO schools (name, created_by) VALUES (school_name, me) RETURNING id INTO sid;
    END IF;
  END IF;
  INSERT INTO cohorts (name, tag, school_id, description)
  VALUES (btrim(p_name), cohort_random_tag(), sid, coalesce(p_description, ''))
  RETURNING * INTO c;
  INSERT INTO cohort_members (cohort_id, user_id, role) VALUES (c.id, me, 'leader');
  RETURN jsonb_build_object('id', c.id, 'tag', c.tag, 'name', c.name);
END;
$$;

-- Join by the 5-character cohort code.
CREATE OR REPLACE FUNCTION cohort_join(p_tag text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  me uuid := auth.uid();
  c cohorts;
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO c FROM cohorts WHERE tag = upper(btrim(p_tag));
  IF NOT FOUND THEN RAISE EXCEPTION 'No cohort with that code'; END IF;
  IF EXISTS (SELECT 1 FROM cohort_members WHERE user_id = me) THEN
    RAISE EXCEPTION 'Leave your current cohort first';
  END IF;
  IF (SELECT count(*) FROM cohort_members WHERE cohort_id = c.id) >= c.max_members THEN
    RAISE EXCEPTION 'That cohort is full';
  END IF;
  INSERT INTO cohort_members (cohort_id, user_id) VALUES (c.id, me);
  RETURN jsonb_build_object('id', c.id, 'tag', c.tag, 'name', c.name);
END;
$$;

-- Whenever a member goes (leaving, removed, or an account deleted): the last one
-- out closes the cohort, and a leaderless cohort passes to the longest-serving
-- officer or member.
CREATE OR REPLACE FUNCTION cohort_after_member_gone() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  heir uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cohort_members WHERE cohort_id = OLD.cohort_id) THEN
    DELETE FROM cohorts WHERE id = OLD.cohort_id;
  ELSIF OLD.role = 'leader' AND NOT EXISTS (SELECT 1 FROM cohort_members WHERE cohort_id = OLD.cohort_id AND role = 'leader') THEN
    SELECT user_id INTO heir FROM cohort_members WHERE cohort_id = OLD.cohort_id
     ORDER BY (role = 'officer') DESC, joined_at LIMIT 1;
    UPDATE cohort_members SET role = 'leader' WHERE cohort_id = OLD.cohort_id AND user_id = heir;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS cohort_member_gone_trg ON cohort_members;
CREATE TRIGGER cohort_member_gone_trg AFTER DELETE ON cohort_members
  FOR EACH ROW EXECUTE FUNCTION cohort_after_member_gone();

CREATE OR REPLACE FUNCTION cohort_leave() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  DELETE FROM cohort_members WHERE user_id = auth.uid();
END;
$$;

-- Leader: make someone an officer or a member (or hand over leadership).
CREATE OR REPLACE FUNCTION cohort_set_role(p_user uuid, p_role text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  me uuid := auth.uid();
  mine cohort_members;
  theirs cohort_members;
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF p_role NOT IN ('leader', 'officer', 'member') THEN RAISE EXCEPTION 'Bad role'; END IF;
  SELECT * INTO mine FROM cohort_members WHERE user_id = me;
  IF NOT FOUND OR mine.role <> 'leader' THEN RAISE EXCEPTION 'Only the leader can do that'; END IF;
  SELECT * INTO theirs FROM cohort_members WHERE user_id = p_user AND cohort_id = mine.cohort_id;
  IF NOT FOUND OR p_user = me THEN RAISE EXCEPTION 'Not a member of your cohort'; END IF;
  UPDATE cohort_members SET role = p_role WHERE cohort_id = mine.cohort_id AND user_id = p_user;
  IF p_role = 'leader' THEN
    UPDATE cohort_members SET role = 'officer' WHERE cohort_id = mine.cohort_id AND user_id = me;
  END IF;
END;
$$;

-- Leader or officer: remove a member (officers can only remove plain members).
CREATE OR REPLACE FUNCTION cohort_kick(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  me uuid := auth.uid();
  mine cohort_members;
  theirs cohort_members;
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO mine FROM cohort_members WHERE user_id = me;
  IF NOT FOUND OR mine.role = 'member' THEN RAISE EXCEPTION 'Only leaders and officers can do that'; END IF;
  SELECT * INTO theirs FROM cohort_members WHERE user_id = p_user AND cohort_id = mine.cohort_id;
  IF NOT FOUND OR p_user = me THEN RAISE EXCEPTION 'Not a member of your cohort'; END IF;
  IF theirs.role = 'leader' OR (theirs.role = 'officer' AND mine.role <> 'leader') THEN
    RAISE EXCEPTION 'You cannot remove that member';
  END IF;
  DELETE FROM cohort_members WHERE cohort_id = mine.cohort_id AND user_id = p_user;
END;
$$;

-- ==================== READING ====================

-- Find cohorts by name or school.
CREATE OR REPLACE FUNCTION cohort_search(p_query text DEFAULT '', p_limit integer DEFAULT 20)
RETURNS TABLE (id uuid, name text, tag text, school text, description text, members integer, max_members integer, trophies bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  SELECT language_dash.require_member();
  SELECT c.id, c.name, c.tag, s.name, c.description,
         (SELECT count(*)::integer FROM cohort_members m WHERE m.cohort_id = c.id),
         c.max_members,
         coalesce((SELECT sum(t.trophies) FROM cohort_members m JOIN player_trophies t ON t.user_id = m.user_id WHERE m.cohort_id = c.id), 0)::bigint
    FROM cohorts c LEFT JOIN schools s ON s.id = c.school_id
   WHERE c.join_mode = 'open'
     AND (coalesce(p_query, '') = '' OR c.name ILIKE '%' || p_query || '%' OR s.name ILIKE '%' || p_query || '%')
   ORDER BY 8 DESC, c.name
   LIMIT least(greatest(p_limit, 1), 50);
$$;

-- My cohort with its roster. Only members can see the roster.
CREATE OR REPLACE FUNCTION my_cohort() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  me uuid := auth.uid();
  m cohort_members;
  c cohorts;
  sname text;
  wk text := cohort_week();
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO m FROM cohort_members WHERE user_id = me;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO c FROM cohorts WHERE id = m.cohort_id;
  SELECT name INTO sname FROM schools WHERE id = c.school_id;
  RETURN jsonb_build_object(
    'id', c.id, 'name', c.name, 'tag', c.tag, 'school', sname, 'description', c.description,
    'my_role', m.role, 'week', wk,
    'war_points', coalesce((SELECT sum(points) FROM cohort_war_points WHERE cohort_id = c.id AND week = wk), 0),
    'members', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'user_id', cm.user_id, 'name', coalesce(p.player_name, 'Anonymous'), 'role', cm.role,
               'trophies', coalesce(t.trophies, 0),
               'war_points', coalesce(w.points, 0))
             ORDER BY coalesce(w.points, 0) DESC, coalesce(t.trophies, 0) DESC)
        FROM cohort_members cm
        LEFT JOIN player_profiles p ON p.user_id = cm.user_id
        LEFT JOIN player_trophies t ON t.user_id = cm.user_id
        LEFT JOIN cohort_war_points w ON w.cohort_id = cm.cohort_id AND w.user_id = cm.user_id AND w.week = wk
       WHERE cm.cohort_id = c.id), '[]'::jsonb)
  );
END;
$$;

-- This week's war ladder: cohorts ranked by war points.
CREATE OR REPLACE FUNCTION cohort_war_standings(p_limit integer DEFAULT 50)
RETURNS TABLE (rank bigint, cohort_id uuid, name text, school text, members integer, war_points bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  SELECT language_dash.require_member();
  SELECT rank() OVER (ORDER BY coalesce(sum(w.points), 0) DESC), c.id, c.name, s.name,
         (SELECT count(*)::integer FROM cohort_members m WHERE m.cohort_id = c.id),
         coalesce(sum(w.points), 0)::bigint
    FROM cohorts c
    LEFT JOIN schools s ON s.id = c.school_id
    LEFT JOIN cohort_war_points w ON w.cohort_id = c.id AND w.week = cohort_week()
   GROUP BY c.id, c.name, s.name
  HAVING coalesce(sum(w.points), 0) > 0
   ORDER BY 6 DESC, c.name
   LIMIT least(greatest(p_limit, 1), 100);
$$;

-- Schools ranked by the war points of all their cohorts this week.
CREATE OR REPLACE FUNCTION school_standings(p_limit integer DEFAULT 50)
RETURNS TABLE (rank bigint, school_id uuid, name text, cohorts integer, war_points bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  SELECT language_dash.require_member();
  SELECT rank() OVER (ORDER BY coalesce(sum(w.points), 0) DESC), s.id, s.name,
         (SELECT count(*)::integer FROM cohorts c2 WHERE c2.school_id = s.id),
         coalesce(sum(w.points), 0)::bigint
    FROM schools s
    JOIN cohorts c ON c.school_id = s.id
    LEFT JOIN cohort_war_points w ON w.cohort_id = c.id AND w.week = cohort_week()
   GROUP BY s.id, s.name
  HAVING coalesce(sum(w.points), 0) > 0
   ORDER BY 5 DESC, s.name
   LIMIT least(greatest(p_limit, 1), 100);
$$;

-- ==================== WAR POINTS ====================
-- Points come only from settled ranked matches, never from the player's device.

CREATE OR REPLACE FUNCTION cohort_add_war_points(p_user uuid, p_points integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  cid uuid;
  wk text := cohort_week();
  have integer;
  give integer;
BEGIN
  SELECT cohort_id INTO cid FROM cohort_members WHERE user_id = p_user;
  IF cid IS NULL THEN RETURN; END IF;
  SELECT coalesce(points, 0) INTO have FROM cohort_war_points WHERE week = wk AND cohort_id = cid AND user_id = p_user;
  have := coalesce(have, 0);
  give := least(p_points, 100 - have);   -- at most 100 points per player per week
  IF give <= 0 THEN RETURN; END IF;
  INSERT INTO cohort_war_points (week, cohort_id, user_id, points) VALUES (wk, cid, p_user, give)
  ON CONFLICT (week, cohort_id, user_id) DO UPDATE SET points = cohort_war_points.points + give, updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION cohort_add_war_points(uuid, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION cohort_on_match_settled() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF NEW.settled AND NOT OLD.settled THEN
    IF NEW.winner_id IS NOT NULL THEN
      PERFORM cohort_add_war_points(NEW.winner_id, 10);
    ELSIF EXISTS (SELECT 1 FROM ranked_reports r WHERE r.match_id = NEW.id AND r.outcome = 'draw') THEN
      PERFORM cohort_add_war_points(NEW.host_id, 3);
      PERFORM cohort_add_war_points(NEW.guest_id, 3);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cohort_war_trg ON ranked_matches;
CREATE TRIGGER cohort_war_trg AFTER UPDATE ON ranked_matches
  FOR EACH ROW EXECUTE FUNCTION cohort_on_match_settled();

-- ==================== WHO MAY CALL WHAT ====================

REVOKE ALL ON FUNCTION cohort_create(text, text, text), cohort_join(text), cohort_leave(),
  cohort_set_role(uuid, text), cohort_kick(uuid), cohort_search(text, integer), my_cohort(),
  cohort_war_standings(integer), school_standings(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION cohort_create(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION cohort_join(text) TO authenticated;
GRANT EXECUTE ON FUNCTION cohort_leave() TO authenticated;
GRANT EXECUTE ON FUNCTION cohort_set_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION cohort_kick(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION cohort_search(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION my_cohort() TO authenticated;
GRANT EXECUTE ON FUNCTION cohort_war_standings(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION school_standings(integer) TO authenticated;

-- Only triggers and other owner-run functions call these: the app roles must not (see the note in schema.sql)
REVOKE ALL ON FUNCTION cohort_week(timestamptz), cohort_random_tag(), cohort_role_of(uuid, uuid), cohort_after_member_gone(),
  cohort_on_match_settled(), cohort_add_war_points(uuid, integer) FROM PUBLIC, anon, authenticated;

-- ===================================================================================================================
-- from database/discovery.sql
-- ===================================================================================================================

-- ================================================================
-- Language Dash — Study-buddy and group discovery (NOT RELEASED YET)
--
-- Lets players be found, and find others, to study with:
--   * Study buddies: a player makes an opt-in listing (exam, exam date, subjects, pace, time zone) and gets a
--     ranked list of compatible players. Contact goes through the normal friend request, so nobody can message
--     a stranger. Listings are OFF until the player turns them on, and only a player with their own listing
--     can browse others.
--   * Groups (clans): the owner can make a group public (with an exam tag and open or by-request joining).
--     Anyone can browse public groups and join or ask to join.
--
-- The game does not show any of it until the build flag VITE_FEATURE_DISCOVERY=1 is set (js/features.js and
-- docs/DISCOVERY.md). Run this file in the Supabase SQL editor AFTER schema.sql and policies.sql. It is safe to
-- run twice. Nothing here can be read or written directly: everything goes through the functions below, which
-- hide blocked players, rate-limit, and never expose more than a name, picture and the listing fields.
-- ================================================================

-- ==================== STUDY BUDDY LISTINGS ====================

CREATE TABLE IF NOT EXISTS buddy_listings (
  user_id      uuid PRIMARY KEY REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  exam         text NOT NULL CHECK (char_length(exam) BETWEEN 1 AND 30),
  exam_date    date,
  subjects     text[] NOT NULL DEFAULT '{}' CHECK (cardinality(subjects) <= 8 AND pg_column_size(subjects) < 700),
  pace         text NOT NULL DEFAULT 'steady' CHECK (pace IN ('relaxed', 'steady', 'intense')),
  utc_offset   smallint CHECK (utc_offset BETWEEN -12 AND 14),
  discoverable boolean NOT NULL DEFAULT false,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS buddy_listings_discoverable_idx ON buddy_listings (exam) WHERE discoverable;

CREATE OR REPLACE FUNCTION set_buddy_listing(p_exam text, p_exam_date date, p_subjects text[], p_pace text,
                                             p_utc_offset integer, p_discoverable boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF p_discoverable AND NOT EXISTS (SELECT 1 FROM player_profiles WHERE user_id = auth.uid() AND visible = true) THEN
    RAISE EXCEPTION 'Make your profile visible first';
  END IF;
  INSERT INTO buddy_listings AS b (user_id, exam, exam_date, subjects, pace, utc_offset, discoverable, updated_at)
  VALUES (auth.uid(), left(trim(p_exam), 30), p_exam_date, coalesce(p_subjects, '{}'), coalesce(p_pace, 'steady'),
          p_utc_offset, coalesce(p_discoverable, false), now())
  ON CONFLICT (user_id) DO UPDATE SET exam = EXCLUDED.exam, exam_date = EXCLUDED.exam_date, subjects = EXCLUDED.subjects,
    pace = EXCLUDED.pace, utc_offset = EXCLUDED.utc_offset, discoverable = EXCLUDED.discoverable, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION my_buddy_listing() RETURNS buddy_listings
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = language_dash, pg_temp AS $$
  SELECT language_dash.require_member();
  SELECT * FROM buddy_listings WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION remove_buddy_listing() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  SELECT language_dash.require_member();
  DELETE FROM buddy_listings WHERE user_id = auth.uid();
$$;

-- Compatible players, best match first. Needs the caller to be discoverable too.
-- Score: same exam 3, exam dates within a month 2 (3 months 1), each shared subject 1 (up to 4),
-- same pace 1, time zones within 3 hours 1.
CREATE OR REPLACE FUNCTION find_buddies(p_limit integer DEFAULT 20)
RETURNS TABLE (user_id uuid, player_name text, avatar text, exam text, exam_date date, subjects text[],
               pace text, utc_offset smallint, score integer)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = language_dash, pg_temp AS $$
DECLARE me buddy_listings;
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT * INTO me FROM buddy_listings WHERE buddy_listings.user_id = auth.uid() AND discoverable;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turn on your own listing to find study buddies'; END IF;
  RETURN QUERY
    SELECT b.user_id, p.player_name, p.avatar, b.exam, b.exam_date, b.subjects, b.pace, b.utc_offset,
      ( (CASE WHEN lower(b.exam) = lower(me.exam) THEN 3 ELSE 0 END)
      + (CASE WHEN b.exam_date IS NULL OR me.exam_date IS NULL THEN 0
              WHEN abs(b.exam_date - me.exam_date) <= 30 THEN 2
              WHEN abs(b.exam_date - me.exam_date) <= 90 THEN 1 ELSE 0 END)
      + least(4, (SELECT count(*) FROM unnest(b.subjects) s WHERE s = ANY (me.subjects)))::integer
      + (CASE WHEN b.pace = me.pace THEN 1 ELSE 0 END)
      + (CASE WHEN b.utc_offset IS NOT NULL AND me.utc_offset IS NOT NULL AND abs(b.utc_offset - me.utc_offset) <= 3 THEN 1 ELSE 0 END)
      ) AS score
    FROM buddy_listings b
    JOIN player_profiles p ON p.user_id = b.user_id AND p.visible = true
    WHERE b.discoverable
      AND b.user_id <> auth.uid()
      AND NOT has_block_between(auth.uid(), b.user_id)
      AND NOT EXISTS (SELECT 1 FROM friends f
                      WHERE (f.requester_id = auth.uid() AND f.addressee_id = b.user_id)
                         OR (f.addressee_id = auth.uid() AND f.requester_id = b.user_id))
    ORDER BY score DESC, b.updated_at DESC
    LIMIT least(greatest(coalesce(p_limit, 20), 1), 30);
END;
$$;


-- ==================== PUBLIC GROUPS ====================

ALTER TABLE study_groups ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private', 'public'));
ALTER TABLE study_groups ADD COLUMN IF NOT EXISTS exam text CHECK (exam IS NULL OR char_length(exam) <= 30);
ALTER TABLE study_groups ADD COLUMN IF NOT EXISTS join_mode text NOT NULL DEFAULT 'open'
  CHECK (join_mode IN ('open', 'request'));

CREATE TABLE IF NOT EXISTS group_join_requests (
  group_id    uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES language_dash.members(user_id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE OR REPLACE FUNCTION set_group_discovery(p_group_id uuid, p_public boolean, p_exam text, p_join_mode text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF p_join_mode NOT IN ('open', 'request') THEN RAISE EXCEPTION 'unknown join mode'; END IF;
  UPDATE study_groups
     SET visibility = CASE WHEN p_public THEN 'public' ELSE 'private' END,
         exam = nullif(left(trim(coalesce(p_exam, '')), 30), ''),
         join_mode = p_join_mode
   WHERE id = p_group_id AND owner_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Only the group owner can change this'; END IF;
END;
$$;

-- Public groups the caller is not in, newest and fullest first. p_query matches the name.
CREATE OR REPLACE FUNCTION discover_groups(p_query text DEFAULT '', p_exam text DEFAULT NULL, p_limit integer DEFAULT 20)
RETURNS TABLE (id uuid, name text, exam text, join_mode text, member_count bigint, weekly_goal integer, owner_name text, requested boolean)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = language_dash, pg_temp AS $$
  SELECT language_dash.require_member();
  SELECT g.id, g.name, g.exam, g.join_mode,
         (SELECT count(*) FROM group_members m WHERE m.group_id = g.id),
         g.weekly_goal,
         coalesce(op.player_name, 'Owner'),
         EXISTS (SELECT 1 FROM group_join_requests r WHERE r.group_id = g.id AND r.user_id = auth.uid())
  FROM study_groups g
  LEFT JOIN player_profiles op ON op.user_id = g.owner_id
  WHERE auth.uid() IS NOT NULL
    AND g.visibility = 'public'
    AND NOT is_group_member(g.id)
    AND NOT has_block_between(auth.uid(), g.owner_id)
    AND (coalesce(p_query, '') = '' OR g.name ILIKE '%' || replace(replace(left(p_query, 40), '%', ''), '_', '') || '%')
    AND (p_exam IS NULL OR lower(g.exam) = lower(p_exam))
  ORDER BY (SELECT count(*) FROM group_members m WHERE m.group_id = g.id) DESC, g.created_at DESC
  LIMIT least(greatest(coalesce(p_limit, 20), 1), 30);
$$;

-- Join an open public group, or ask to join one that approves members. Returns 'joined' or 'requested'.
CREATE OR REPLACE FUNCTION join_public_group(p_group_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE g study_groups;
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT * INTO g FROM study_groups WHERE id = p_group_id AND visibility = 'public';
  IF NOT FOUND OR has_block_between(auth.uid(), g.owner_id) THEN RAISE EXCEPTION 'That group is not available'; END IF;
  IF is_group_member(g.id) THEN RETURN 'joined'; END IF;
  IF (SELECT count(*) FROM group_members WHERE group_id = g.id) >= 100 THEN RAISE EXCEPTION 'This group is full'; END IF;
  IF g.join_mode = 'open' THEN
    INSERT INTO group_members (group_id, user_id) VALUES (g.id, auth.uid()) ON CONFLICT DO NOTHING;
    RETURN 'joined';
  END IF;
  IF (SELECT count(*) FROM group_join_requests WHERE user_id = auth.uid()) >= 5 THEN
    RAISE EXCEPTION 'You have too many pending requests';
  END IF;
  INSERT INTO group_join_requests (group_id, user_id) VALUES (g.id, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN 'requested';
END;
$$;

CREATE OR REPLACE FUNCTION cancel_group_request(p_group_id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  SELECT language_dash.require_member();
  DELETE FROM group_join_requests WHERE group_id = p_group_id AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION group_requests(p_group_id uuid)
RETURNS TABLE (user_id uuid, player_name text, avatar text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM study_groups WHERE id = p_group_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the group owner can see requests';
  END IF;
  RETURN QUERY
    SELECT r.user_id, coalesce(p.player_name, 'Player'), coalesce(p.avatar, 'avatar_intern'), r.created_at
    FROM group_join_requests r
    LEFT JOIN player_profiles p ON p.user_id = r.user_id
    WHERE r.group_id = p_group_id AND NOT has_block_between(auth.uid(), r.user_id)
    ORDER BY r.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION resolve_group_request(p_group_id uuid, p_user uuid, p_accept boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM study_groups WHERE id = p_group_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the group owner can answer requests';
  END IF;
  IF p_accept THEN
    IF (SELECT count(*) FROM group_members WHERE group_id = p_group_id) >= 100 THEN RAISE EXCEPTION 'This group is full'; END IF;
    IF NOT EXISTS (SELECT 1 FROM group_join_requests WHERE group_id = p_group_id AND user_id = p_user) THEN
      RAISE EXCEPTION 'No such request';
    END IF;
    INSERT INTO group_members (group_id, user_id) VALUES (p_group_id, p_user) ON CONFLICT DO NOTHING;
  END IF;
  DELETE FROM group_join_requests WHERE group_id = p_group_id AND user_id = p_user;
END;
$$;

-- my_groups() gains the discovery fields (re-created, since the return type grew)
DROP FUNCTION IF EXISTS my_groups();
CREATE OR REPLACE FUNCTION my_groups()
RETURNS TABLE (id uuid, name text, code text, member_count bigint, is_owner boolean, weekly_goal integer,
               visibility text, exam text, join_mode text, pending_requests bigint)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = language_dash, pg_temp AS $$
  SELECT language_dash.require_member();
  SELECT g.id, g.name, g.code,
         (SELECT count(*) FROM group_members m2 WHERE m2.group_id = g.id),
         g.owner_id = auth.uid(), g.weekly_goal, g.visibility, g.exam, g.join_mode,
         CASE WHEN g.owner_id = auth.uid() THEN (SELECT count(*) FROM group_join_requests r WHERE r.group_id = g.id) ELSE 0 END
  FROM study_groups g
  JOIN group_members m ON m.group_id = g.id AND m.user_id = auth.uid()
  ORDER BY g.created_at;
$$;


-- ==================== WHO MAY CALL WHAT ====================

ALTER TABLE buddy_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON buddy_listings, group_join_requests FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION set_buddy_listing(text, date, text[], text, integer, boolean), my_buddy_listing(), remove_buddy_listing(),
  find_buddies(integer), set_group_discovery(uuid, boolean, text, text), discover_groups(text, text, integer),
  join_public_group(uuid), cancel_group_request(uuid), group_requests(uuid), resolve_group_request(uuid, uuid, boolean),
  my_groups() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_buddy_listing(text, date, text[], text, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION my_buddy_listing() TO authenticated;
GRANT EXECUTE ON FUNCTION remove_buddy_listing() TO authenticated;
GRANT EXECUTE ON FUNCTION find_buddies(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION set_group_discovery(uuid, boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION discover_groups(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION join_public_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_group_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION group_requests(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_group_request(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION my_groups() TO authenticated;

-- ===================================================================================================================
-- from database/pro.sql
-- ===================================================================================================================

-- ================================================================
-- Language Dash Pro: who has it, and the codes that grant it. Safe to run again.
--
-- Pro bought in the phone apps lives in the store (Google Play / App Store) and is read from there. This file is for
-- everything else: web payments (a Stripe webhook or you, with the service key, calls pro_grant), promo and
-- ambassador codes, and school or group seats (hand out codes). The app can only ask "do I have Pro?" and "redeem
-- this code"; it cannot grant itself anything.
--
-- Handing out a code (SQL editor):
--   INSERT INTO pro_codes (code, days, max_uses, note) VALUES ('LAUNCH30', 30, 500, 'launch week');
-- Granting by hand / from a webhook (service role):
--   SELECT pro_grant('<user uuid>', 365, 'yearly', 'stripe');
-- ================================================================

CREATE TABLE IF NOT EXISTS pro_entitlements (
  user_id uuid PRIMARY KEY,
  plan text NOT NULL DEFAULT 'pro',
  source text NOT NULL DEFAULT 'manual',
  until timestamptz NOT NULL,
  trial boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- When this stretch of Pro began: kept across renewals, restarted after a lapse or when a trial turns into a purchase.
-- The monthly Locker gift counts its months from here.
ALTER TABLE pro_entitlements ADD COLUMN IF NOT EXISTS started_at timestamptz NOT NULL DEFAULT now();

-- Locker items bought with real money (the premium items). One row per member and item; kept for good unless refunded.
CREATE TABLE IF NOT EXISTS pro_items (
  user_id uuid NOT NULL,
  item_id text NOT NULL CHECK (item_id ~ '^[a-z0-9_]{3,64}$'),
  source text NOT NULL DEFAULT 'stripe',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);
-- Which payment bought it, so paying twice for the same item is noticed (and the second payment can be returned) and a
-- refund of that second payment cannot take away the item the first one paid for.
ALTER TABLE pro_items ADD COLUMN IF NOT EXISTS payment_ref text;
ALTER TABLE pro_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS pro_codes (
  code text PRIMARY KEY CHECK (code = upper(code) AND code ~ '^[A-Z0-9_-]{4,32}$'),
  days integer NOT NULL CHECK (days BETWEEN 1 AND 3650),
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  used integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pro_redemptions (
  code text NOT NULL REFERENCES pro_codes (code) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (code, user_id)
);

-- failed guesses per user per hour (stops code guessing)
CREATE TABLE IF NOT EXISTS pro_attempts (
  user_id uuid NOT NULL,
  hour timestamptz NOT NULL,
  n integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, hour)
);

-- web payments (Stripe): who paid, which Stripe customer is whose, and which webhook events were already handled
CREATE TABLE IF NOT EXISTS pro_library (
  user_id uuid PRIMARY KEY,
  source text NOT NULL DEFAULT 'manual',
  granted_at timestamptz NOT NULL DEFAULT now()
);
-- the free trial every signed-in (not guest) account gets once
CREATE TABLE IF NOT EXISTS pro_trials (
  user_id uuid PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pro_stripe_customers (
  customer_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pro_stripe_customers_user ON pro_stripe_customers (user_id);
CREATE TABLE IF NOT EXISTS pro_stripe_events (
  event_id text PRIMARY KEY,
  kind text,
  handled_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pro_trials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pro_trials FROM PUBLIC, anon, authenticated;
ALTER TABLE pro_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_stripe_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pro_library, pro_stripe_customers, pro_stripe_events FROM PUBLIC, anon, authenticated;

ALTER TABLE pro_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pro_entitlements, pro_codes, pro_redemptions, pro_attempts, pro_items FROM PUBLIC, anon, authenticated;

-- Is the caller a guest (anonymous sign-in, no account)? Guests get no trial: it is the reason to create an account.
CREATE OR REPLACE FUNCTION pro_is_guest() RETURNS boolean
LANGUAGE sql STABLE SET search_path = language_dash, pg_temp AS $$
  SELECT coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;

-- Do I have Pro right now? { active, until, plan, source, trial, since, library, trial_available }
-- (library: I hold the one-time Full Library unlock from before it was withdrawn, which opens every card but not the tools;
--  trial_available: I have an account, have never had the free trial and have no Pro, so the app may start it)
CREATE OR REPLACE FUNCTION get_my_pro() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE me uuid := auth.uid(); r pro_entitlements%ROWTYPE; lib boolean; can_trial boolean; its jsonb;
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF me IS NULL THEN RETURN jsonb_build_object('active', false, 'library', false, 'trial_available', false, 'items', '[]'::jsonb, 'signed_in', false); END IF;
  its := coalesce((SELECT jsonb_agg(item_id ORDER BY created_at) FROM pro_items WHERE user_id = me), '[]'::jsonb);
  lib := EXISTS (SELECT 1 FROM pro_library WHERE user_id = me);
  can_trial := NOT pro_is_guest() AND NOT EXISTS (SELECT 1 FROM pro_trials WHERE user_id = me);
  SELECT * INTO r FROM pro_entitlements WHERE user_id = me;
  IF NOT FOUND OR r.until <= now() THEN RETURN jsonb_build_object('active', false, 'library', lib, 'trial_available', can_trial, 'items', its, 'signed_in', true); END IF;
  RETURN jsonb_build_object('active', true, 'until', r.until, 'plan', r.plan, 'source', r.source, 'trial', r.trial, 'since', r.started_at, 'library', lib, 'trial_available', false, 'items', its, 'signed_in', true);
END $$;

-- Start my free trial: seven days of Pro, once per account, for a signed-in (not guest) player who has no Pro.
CREATE OR REPLACE FUNCTION start_my_trial() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE me uuid := auth.uid(); new_until timestamptz;
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF me IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Sign in first.'); END IF;
  IF pro_is_guest() THEN RETURN jsonb_build_object('ok', false, 'error', 'Create an account to get your free trial.'); END IF;
  IF EXISTS (SELECT 1 FROM pro_entitlements WHERE user_id = me AND until > now()) THEN RETURN jsonb_build_object('ok', false, 'error', 'You already have Pro.'); END IF;
  BEGIN
    INSERT INTO pro_trials (user_id) VALUES (me);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'The free trial has already been used.');
  END;
  new_until := pro_grant_until(me, now() + interval '7 days', 'trial', 'trial', true);
  RETURN jsonb_build_object('ok', true, 'until', new_until, 'days', 7);
END $$;

-- Give Pro for some days (adds to what is left). Service role / SQL editor only.
CREATE OR REPLACE FUNCTION pro_grant(p_user uuid, p_days integer, p_plan text DEFAULT 'pro', p_source text DEFAULT 'manual', p_trial boolean DEFAULT false) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE new_until timestamptz;
BEGIN
  IF p_days IS NULL OR p_days < 1 OR p_days > 3650 THEN RAISE EXCEPTION 'days must be 1 to 3650'; END IF;
  INSERT INTO pro_entitlements AS e (user_id, plan, source, until, trial, updated_at, started_at)
  VALUES (p_user, coalesce(p_plan, 'pro'), coalesce(p_source, 'manual'), now() + make_interval(days => p_days), coalesce(p_trial, false), now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    until = greatest(e.until, now()) + make_interval(days => p_days),
    plan = excluded.plan, source = excluded.source, trial = excluded.trial AND e.until > now(), updated_at = now(),
    started_at = CASE WHEN e.until <= now() OR (e.trial AND NOT excluded.trial) THEN now() ELSE e.started_at END
  RETURNING until INTO new_until;
  RETURN new_until;
END $$;

-- End someone's Pro now. Service role / SQL editor only.
CREATE OR REPLACE FUNCTION pro_revoke(p_user uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  UPDATE pro_entitlements SET until = now(), updated_at = now() WHERE user_id = p_user;
$$;

-- Give a member a premium Locker item they paid for (safe to repeat). Service role only.
-- Returns 'granted' (new), 'already' (the same payment again, or an older item with no payment on record) or 'duplicate'
-- (they already own it from a DIFFERENT payment: the second payment should be returned).
DROP FUNCTION IF EXISTS pro_grant_item(uuid, text, text);
CREATE OR REPLACE FUNCTION pro_grant_item(p_user uuid, p_item text, p_source text DEFAULT 'stripe', p_ref text DEFAULT NULL) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE had text; have boolean;
BEGIN
  INSERT INTO pro_items (user_id, item_id, source, payment_ref) VALUES (p_user, p_item, coalesce(p_source, 'stripe'), p_ref)
  ON CONFLICT (user_id, item_id) DO NOTHING;
  IF FOUND THEN RETURN 'granted'; END IF;
  SELECT payment_ref INTO had FROM pro_items WHERE user_id = p_user AND item_id = p_item;
  IF had IS NULL THEN
    UPDATE pro_items SET payment_ref = p_ref WHERE user_id = p_user AND item_id = p_item;
    RETURN 'already';
  END IF;
  IF p_ref IS NULL OR p_ref = had THEN RETURN 'already'; END IF;
  RETURN 'duplicate';
END $$;

-- Take back a premium item after a full refund. Service role only.
-- With p_ref, only if that payment is the one that bought it (the refund of a duplicate payment must not take the item).
DROP FUNCTION IF EXISTS pro_revoke_item(uuid, text);
CREATE OR REPLACE FUNCTION pro_revoke_item(p_user uuid, p_item text, p_ref text DEFAULT NULL) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  DELETE FROM pro_items WHERE user_id = p_user AND item_id = p_item AND (p_ref IS NULL OR payment_ref IS NULL OR payment_ref = p_ref);
$$;

-- Does this member already own this premium item? Service role only (the checkout function uses it to stop a double purchase).
CREATE OR REPLACE FUNCTION pro_has_item(p_user uuid, p_item text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM pro_items WHERE user_id = p_user AND item_id = p_item);
$$;

-- Take back only a particular plan (a refunded lifetime must not end a subscription the same person also holds). Service role only.
CREATE OR REPLACE FUNCTION pro_revoke_plan(p_user uuid, p_plan text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  UPDATE pro_entitlements SET until = now(), updated_at = now() WHERE user_id = p_user AND plan = p_plan;
$$;

-- Forget a member's payment records when their account is deleted (these tables hold a user id but, unlike the rest of the
-- app's data, do not cascade from the login). Service role / the delete function only.
CREATE OR REPLACE FUNCTION pro_forget_user(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  DELETE FROM pro_entitlements WHERE user_id = p_user;
  DELETE FROM pro_items WHERE user_id = p_user;
  DELETE FROM pro_library WHERE user_id = p_user;
  DELETE FROM pro_trials WHERE user_id = p_user;
  DELETE FROM pro_redemptions WHERE user_id = p_user;
  DELETE FROM pro_attempts WHERE user_id = p_user;
  DELETE FROM pro_stripe_customers WHERE user_id = p_user;
  DELETE FROM apple_tokens WHERE user_id = p_user;
  DELETE FROM pro_store_purchases WHERE user_id = p_user;
END $$;

-- The Sign in with Apple token of an account, kept only so that deleting the account can revoke it (an App Store rule).
-- Service role only; it is removed with the account.
CREATE TABLE IF NOT EXISTS apple_tokens (
  user_id uuid PRIMARY KEY,
  refresh_token text NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE apple_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON apple_tokens FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION apple_token_save(p_user uuid, p_token text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  INSERT INTO apple_tokens (user_id, refresh_token) VALUES (p_user, p_token)
  ON CONFLICT (user_id) DO UPDATE SET refresh_token = excluded.refresh_token, saved_at = now();
$$;
CREATE OR REPLACE FUNCTION apple_token_get(p_user uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  SELECT refresh_token FROM apple_tokens WHERE user_id = p_user;
$$;
REVOKE ALL ON FUNCTION apple_token_save(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION apple_token_get(uuid) FROM PUBLIC, anon, authenticated;

-- Purchases made through Google Play or the App Store and checked with them (supabase/functions/iap-verify). One purchase
-- belongs to one account: the first account to present it keeps it. Service role only.
CREATE TABLE IF NOT EXISTS pro_store_purchases (
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  store_key text NOT NULL,
  user_id uuid NOT NULL,
  product_id text NOT NULL,
  expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  verified_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (platform, store_key)
);
ALTER TABLE pro_store_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pro_store_purchases FROM PUBLIC, anon, authenticated;

-- Record a checked purchase for an account. 'ok' (new, or the same account again), or 'other_account' when a different
-- account already holds this purchase.
CREATE OR REPLACE FUNCTION pro_store_claim(p_platform text, p_key text, p_user uuid, p_product text, p_expires timestamptz, p_revoked boolean) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE owner uuid;
BEGIN
  SELECT user_id INTO owner FROM pro_store_purchases WHERE platform = p_platform AND store_key = p_key FOR UPDATE;
  IF FOUND THEN
    IF owner <> p_user THEN RETURN 'other_account'; END IF;
    UPDATE pro_store_purchases SET expires_at = p_expires, revoked = coalesce(p_revoked, false), verified_at = now(), product_id = p_product
    WHERE platform = p_platform AND store_key = p_key;
    RETURN 'ok';
  END IF;
  BEGIN
    INSERT INTO pro_store_purchases (platform, store_key, user_id, product_id, expires_at, revoked) VALUES (p_platform, p_key, p_user, p_product, p_expires, coalesce(p_revoked, false));
  EXCEPTION WHEN unique_violation THEN
    RETURN 'other_account';  -- (someone claimed it between the check and the insert)
  END;
  RETURN 'ok';
END $$;
REVOKE ALL ON FUNCTION pro_store_claim(text, text, uuid, text, timestamptz, boolean) FROM PUBLIC, anon, authenticated;

-- Redeem a code: { ok, until } or { ok: false, error }. Ten wrong guesses an hour is the limit.
CREATE OR REPLACE FUNCTION redeem_pro_code(p_code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  me uuid := auth.uid();
  c pro_codes%ROWTYPE;
  h timestamptz := date_trunc('hour', now());
  tries integer;
  new_until timestamptz;
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  IF me IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Sign in first.'); END IF;
  -- a code is tied to one real account (an email and a password), never to a guest, so it cannot be passed around
  IF pro_is_guest() THEN RETURN jsonb_build_object('ok', false, 'error', 'Create a free account first (Friends → Account), so the code is tied to you.'); END IF;
  INSERT INTO pro_attempts (user_id, hour, n) VALUES (me, h, 0) ON CONFLICT DO NOTHING;
  SELECT n INTO tries FROM pro_attempts WHERE user_id = me AND hour = h;
  IF tries >= 10 THEN RETURN jsonb_build_object('ok', false, 'error', 'Too many tries. Please wait an hour.'); END IF;
  SELECT * INTO c FROM pro_codes WHERE code = upper(trim(coalesce(p_code, ''))) FOR UPDATE;
  IF NOT FOUND OR (c.expires_at IS NOT NULL AND c.expires_at < now()) OR c.used >= c.max_uses THEN
    UPDATE pro_attempts SET n = n + 1 WHERE user_id = me AND hour = h;
    RETURN jsonb_build_object('ok', false, 'error', 'That code is not valid.');
  END IF;
  IF EXISTS (SELECT 1 FROM pro_redemptions WHERE code = c.code AND user_id = me) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You already used that code.');
  END IF;
  INSERT INTO pro_redemptions (code, user_id) VALUES (c.code, me);
  UPDATE pro_codes SET used = used + 1 WHERE code = c.code;
  new_until := pro_grant(me, c.days, 'pro', 'code', false);
  RETURN jsonb_build_object('ok', true, 'until', new_until, 'days', c.days);
END $$;

-- Set Pro to last until an exact moment (a web subscription: the end of the period just paid). Never shortens a longer
-- lifetime or code grant. Service role only.
CREATE OR REPLACE FUNCTION pro_grant_until(p_user uuid, p_until timestamptz, p_plan text DEFAULT 'pro', p_source text DEFAULT 'stripe', p_trial boolean DEFAULT false) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE new_until timestamptz;
BEGIN
  IF p_until IS NULL OR p_until > now() + interval '3651 days' THEN RAISE EXCEPTION 'until is out of range'; END IF;
  INSERT INTO pro_entitlements AS e (user_id, plan, source, until, trial, updated_at, started_at)
  VALUES (p_user, coalesce(p_plan, 'pro'), coalesce(p_source, 'stripe'), p_until, coalesce(p_trial, false), now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    until = greatest(e.until, excluded.until),
    plan = CASE WHEN excluded.until >= e.until THEN excluded.plan ELSE e.plan END,
    source = CASE WHEN excluded.until >= e.until THEN excluded.source ELSE e.source END,
    trial = excluded.trial AND excluded.until >= e.until,
    updated_at = now(),
    started_at = CASE WHEN e.until <= now() OR (e.trial AND NOT excluded.trial) THEN now() ELSE e.started_at END
  RETURNING until INTO new_until;
  RETURN new_until;
END $$;

-- The one-time Full Library unlock (every card, no tools). Service role only.
CREATE OR REPLACE FUNCTION pro_grant_library(p_user uuid, p_source text DEFAULT 'stripe') RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  INSERT INTO pro_library (user_id, source) VALUES (p_user, coalesce(p_source, 'stripe')) ON CONFLICT (user_id) DO NOTHING;
$$;

-- Take a refunded Full Library unlock back. Service role only.
CREATE OR REPLACE FUNCTION pro_revoke_library(p_user uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  DELETE FROM pro_library WHERE user_id = p_user;
$$;

-- Remember that a Stripe customer is this player, and which Stripe user a renewal belongs to. Service role only.
CREATE OR REPLACE FUNCTION pro_link_customer(p_customer text, p_user uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  INSERT INTO pro_stripe_customers (customer_id, user_id) VALUES (p_customer, p_user) ON CONFLICT (customer_id) DO NOTHING;
$$;
CREATE OR REPLACE FUNCTION pro_customer_user(p_customer text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  SELECT user_id FROM pro_stripe_customers WHERE customer_id = p_customer;
$$;
CREATE OR REPLACE FUNCTION pro_user_customer(p_user uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
  SELECT customer_id FROM pro_stripe_customers WHERE user_id = p_user ORDER BY created_at DESC LIMIT 1;
$$;

-- True the first time an event id is seen, false for a repeat (Stripe sends some events more than once). Service role only.
CREATE OR REPLACE FUNCTION pro_event_once(p_event text, p_kind text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  INSERT INTO pro_stripe_events (event_id, kind) VALUES (p_event, p_kind);
  RETURN true;
EXCEPTION WHEN unique_violation THEN
  RETURN false;
END $$;

REVOKE ALL ON FUNCTION pro_grant_until(uuid, timestamptz, text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION pro_grant_library(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION pro_revoke_library(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION pro_link_customer(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION pro_customer_user(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION pro_user_customer(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION pro_event_once(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION get_my_pro() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION pro_grant(uuid, integer, text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION pro_revoke(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION pro_revoke_plan(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION pro_grant_item(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION pro_revoke_item(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION pro_has_item(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION pro_forget_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION redeem_pro_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_my_pro() TO authenticated;
REVOKE ALL ON FUNCTION start_my_trial() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION start_my_trial() TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_pro_code(text) TO authenticated;

-- Make a code (owner only: run it in the Supabase SQL editor). It returns the code to hand to one person:
--   SELECT pro_make_code(p_days => 90, p_note => 'reviewer: Jane at Example');
-- Each code works once, for one account with a login, then it is spent. Give p_max_uses > 1 only for a deliberate group
-- code (a class), and p_expires_days to make it lapse. Pass p_code to choose the words yourself.
CREATE OR REPLACE FUNCTION pro_make_code(p_days integer, p_note text DEFAULT NULL, p_max_uses integer DEFAULT 1, p_expires_days integer DEFAULT NULL, p_code text DEFAULT NULL) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE c text; h text;
BEGIN
  IF p_code IS NOT NULL THEN
    c := upper(trim(p_code));
  ELSE
    h := upper(md5(random()::text || clock_timestamp()::text || txid_current()::text));
    c := 'DX-' || substr(h, 1, 4) || '-' || substr(h, 5, 4) || '-' || substr(h, 9, 4);
  END IF;
  INSERT INTO pro_codes (code, days, max_uses, expires_at, note)
  VALUES (c, p_days, coalesce(p_max_uses, 1), CASE WHEN p_expires_days IS NULL THEN NULL ELSE now() + make_interval(days => p_expires_days) END, p_note);
  RETURN c;
END $$;

-- Owner views: who has Pro, and how codes are doing
CREATE OR REPLACE VIEW pro_v_active AS
SELECT plan, source, trial, count(*) AS users, min(until) AS first_ends, max(until) AS last_ends
FROM pro_entitlements WHERE until > now() GROUP BY 1, 2, 3 ORDER BY users DESC;

CREATE OR REPLACE VIEW pro_v_codes AS
SELECT code, days, max_uses, used, expires_at, note, created_at FROM pro_codes ORDER BY created_at DESC;

-- who used which code, and when
CREATE OR REPLACE VIEW pro_v_redemptions AS
SELECT r.code, c.note, c.days, r.user_id, r.redeemed_at FROM pro_redemptions r JOIN pro_codes c USING (code) ORDER BY r.redeemed_at DESC;

-- which premium items sell, and whether any were bought twice
CREATE OR REPLACE VIEW pro_v_items AS
SELECT item_id, source, count(*) AS owners, min(created_at) AS first_sold, max(created_at) AS last_sold
FROM pro_items GROUP BY 1, 2 ORDER BY owners DESC;

-- phone-store purchases checked with Google Play / the App Store
CREATE OR REPLACE VIEW pro_v_store AS
SELECT platform, product_id, count(*) AS purchases, count(*) FILTER (WHERE revoked) AS refunded, max(verified_at) AS last_checked
FROM pro_store_purchases GROUP BY 1, 2 ORDER BY purchases DESC;

-- webhook events handled in the last week (a quiet list on a day with sales means the webhook is not arriving)
CREATE OR REPLACE VIEW pro_v_recent_events AS
SELECT kind, count(*) AS handled, max(handled_at) AS last_seen
FROM pro_stripe_events WHERE handled_at > now() - interval '7 days' GROUP BY 1 ORDER BY last_seen DESC;

REVOKE ALL ON pro_v_active, pro_v_codes, pro_v_redemptions, pro_v_items, pro_v_store, pro_v_recent_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION pro_make_code(integer, text, integer, integer, text) FROM PUBLIC, anon, authenticated;

-- ===================================================================================================================
-- from database/analytics.sql
-- ===================================================================================================================

-- ================================================================
-- Language Dash — first-party analytics (tables, ingest, privacy functions)
--
-- Run after schema.sql and policies.sql. Safe to run twice.
-- The views for reading the data are in analytics_views.sql.
--
-- Who can do what:
--   * the app (anon or signed in) can only call three functions: ingest_analytics (send a batch of events),
--     delete_analytics (erase an install's data) and count_consent (the anonymous yes/no tally);
--   * nobody but the project owner (the SQL editor, or the service role key) can read any of the tables or views.
--
-- What is stored: a random install id made on the device (not tied to a name, e-mail or account), session ids,
-- the events in js/analytics/catalog.js with their listed properties, bucketed device details, and campaign tags.
-- Never names, e-mail addresses, card text, free text, advertising ids or IP addresses.
-- ================================================================

-- ==================== INSTALLS ====================

CREATE TABLE IF NOT EXISTS analytics_installs (
  install_id        uuid PRIMARY KEY,
  first_seen        timestamptz NOT NULL DEFAULT now(),
  last_seen         timestamptz NOT NULL DEFAULT now(),
  platform          text,                         -- web, android, ios
  first_version     text,
  last_version      text,
  first_channel     text,                         -- direct, search, social, paid, email, share, referral, campaign, store
  first_source      text,
  first_medium      text,
  first_campaign    text,
  first_content     text,
  first_term        text,
  first_referrer    text,                         -- the sending site's host name only
  first_landing     text,
  has_click_id      boolean NOT NULL DEFAULT false,
  ref_code          text,                         -- this install's share code (a one-way hash of its id)
  referred_by_code  text,                         -- the share code of the install whose link brought this one
  consent_version   integer,
  events_total      bigint NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS analytics_installs_first_seen ON analytics_installs (first_seen);
CREATE INDEX IF NOT EXISTS analytics_installs_channel ON analytics_installs (first_channel, first_source);
CREATE UNIQUE INDEX IF NOT EXISTS analytics_installs_ref_code ON analytics_installs (ref_code) WHERE ref_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_installs_referred_by ON analytics_installs (referred_by_code) WHERE referred_by_code IS NOT NULL;

-- ==================== SESSIONS ====================

CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id     uuid PRIMARY KEY,
  install_id     uuid NOT NULL,
  started_at     timestamptz NOT NULL,
  platform       text,
  version        text,
  build          text,
  os             text,
  os_major       integer,
  browser        text,
  browser_major  integer,
  form           text,                            -- phone, tablet, desktop
  screen_w       integer,
  screen_h       integer,
  dpr            real,
  portrait       boolean,
  touch          boolean,
  standalone     boolean,
  language       text,
  tz_offset      real,
  memory_gb      integer,
  cores          integer,
  connection     text,
  save_data      boolean,
  tier           text,
  dark           boolean,
  reduced_motion boolean,
  webgl2         boolean,
  last_channel   text,
  last_source    text,
  last_medium    text,
  last_campaign  text,
  last_referrer  text
);
CREATE INDEX IF NOT EXISTS analytics_sessions_install ON analytics_sessions (install_id, started_at);
CREATE INDEX IF NOT EXISTS analytics_sessions_started ON analytics_sessions (started_at);

-- ==================== EVENTS ====================

CREATE TABLE IF NOT EXISTS analytics_events (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id     uuid NOT NULL,
  install_id   uuid NOT NULL,
  session_id   uuid,
  name         text NOT NULL,
  ts           timestamptz NOT NULL,              -- when it happened, corrected for the device's clock
  received_at  timestamptz NOT NULL DEFAULT now(),
  seq          integer,
  sample_rate  real NOT NULL DEFAULT 1,           -- below 1 when the event is only sent for a share of the time (weight by 1/sample_rate)
  props        jsonb NOT NULL DEFAULT '{}'::jsonb,
  experiments  jsonb,
  CONSTRAINT analytics_events_name_ok CHECK (name ~ '^[a-z0-9_]{2,48}$')
);
CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_event_id ON analytics_events (event_id);
CREATE INDEX IF NOT EXISTS analytics_events_name_ts ON analytics_events (name, ts);
CREATE INDEX IF NOT EXISTS analytics_events_install_ts ON analytics_events (install_id, ts);
CREATE INDEX IF NOT EXISTS analytics_events_session ON analytics_events (session_id);
CREATE INDEX IF NOT EXISTS analytics_events_received ON analytics_events (received_at);

-- ==================== RATE LIMITS AND TALLIES ====================

CREATE TABLE IF NOT EXISTS analytics_limits (
  install_id uuid NOT NULL,
  hour       timestamptz NOT NULL,
  n          integer NOT NULL DEFAULT 0,
  PRIMARY KEY (install_id, hour)
);

CREATE TABLE IF NOT EXISTS analytics_consent_counts (
  day      date NOT NULL,
  outcome  text NOT NULL CHECK (outcome IN ('shown', 'granted', 'denied')),
  source   text NOT NULL DEFAULT '',
  platform text NOT NULL DEFAULT '',
  version  text NOT NULL DEFAULT '',
  n        integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, outcome, source, platform, version)
);

-- ==================== LOCK THE TABLES ====================

ALTER TABLE analytics_installs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_consent_counts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON analytics_installs, analytics_sessions, analytics_events, analytics_limits, analytics_consent_counts FROM PUBLIC, anon, authenticated;

-- ==================== HELPERS ====================

CREATE OR REPLACE FUNCTION analytics_txt(p jsonb, k text, maxlen integer DEFAULT 60) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = language_dash, pg_temp
AS $$
  SELECT CASE WHEN jsonb_typeof(p -> k) = 'string' THEN left(p ->> k, maxlen) END
$$;

CREATE OR REPLACE FUNCTION analytics_num(p jsonb, k text) RETURNS numeric
LANGUAGE sql IMMUTABLE SET search_path = language_dash, pg_temp
AS $$
  SELECT CASE WHEN jsonb_typeof(p -> k) = 'number' THEN (p ->> k)::numeric END
$$;

CREATE OR REPLACE FUNCTION analytics_bool(p jsonb, k text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = language_dash, pg_temp
AS $$
  SELECT CASE WHEN jsonb_typeof(p -> k) = 'boolean' THEN (p ->> k)::boolean END
$$;

-- ==================== SEND A BATCH ====================
-- p_batch: { sent_at, install: {id, first, ref_code, platform, version, consent_v},
--            sessions: { <session id>: { ctx, last, started } }, events: [ {id, n, t, q, s, p, r, x} ] }
-- Returns { accepted, duplicates, rejected, now }.

CREATE OR REPLACE FUNCTION ingest_analytics(p_batch jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  v_install  uuid;
  v_inst     jsonb;
  v_first    jsonb;
  v_count    integer;
  v_sent_ms  numeric;
  v_skew     interval;
  v_hour     timestamptz := date_trunc('hour', now());
  v_used     integer;
  ev         jsonb;
  v_name     text;
  v_event_id uuid;
  v_session  uuid;
  v_ts       timestamptz;
  v_props    jsonb;
  v_rate     real;
  v_accepted integer := 0;
  v_rejected integer := 0;
  v_rows     integer;
  sk         text;
  sv         jsonb;
  ctx        jsonb;
  lt         jsonb;
  v_ref      text;
BEGIN
  IF p_batch IS NULL OR jsonb_typeof(p_batch) <> 'object' THEN RAISE EXCEPTION 'bad batch'; END IF;
  v_inst := p_batch -> 'install';
  IF v_inst IS NULL OR jsonb_typeof(v_inst) <> 'object' OR coalesce(v_inst ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'bad install';
  END IF;
  v_install := (v_inst ->> 'id')::uuid;
  IF jsonb_typeof(p_batch -> 'events') <> 'array' THEN RAISE EXCEPTION 'bad events'; END IF;
  v_count := jsonb_array_length(p_batch -> 'events');
  IF v_count > 100 THEN RAISE EXCEPTION 'batch too large'; END IF;
  IF jsonb_typeof(p_batch -> 'sent_at') <> 'number' THEN RAISE EXCEPTION 'bad sent_at'; END IF;
  v_sent_ms := (p_batch ->> 'sent_at')::numeric;
  -- the device's clock may be wrong: every event time is moved by how far off it was when the batch was sent
  v_skew := now() - to_timestamp(v_sent_ms / 1000.0);
  IF v_skew > interval '30 days' OR v_skew < interval '-30 days' THEN v_skew := interval '0'; END IF;

  -- a limit per install per hour, so a script cannot fill the table
  INSERT INTO analytics_limits (install_id, hour, n) VALUES (v_install, v_hour, v_count)
  ON CONFLICT (install_id, hour) DO UPDATE SET n = analytics_limits.n + EXCLUDED.n
  RETURNING n INTO v_used;
  IF v_used > 4000 THEN
    RETURN jsonb_build_object('accepted', 0, 'duplicates', 0, 'rejected', v_count, 'limited', true, 'now', (extract(epoch FROM now()) * 1000)::bigint);
  END IF;

  -- the install row
  v_first := CASE WHEN jsonb_typeof(v_inst -> 'first') = 'object' THEN v_inst -> 'first' ELSE '{}'::jsonb END;
  v_ref := CASE WHEN analytics_txt(v_first, 'share_ref', 16) ~ '^[a-z0-9]{4,16}$' THEN analytics_txt(v_first, 'share_ref', 16) END;
  INSERT INTO analytics_installs (install_id, platform, first_version, last_version, first_channel, first_source, first_medium, first_campaign, first_content,
                                  first_term, first_referrer, first_landing, has_click_id, ref_code, referred_by_code, consent_version)
  VALUES (v_install, left(coalesce(v_inst ->> 'platform', 'web'), 12), left(v_inst ->> 'version', 20), left(v_inst ->> 'version', 20),
          analytics_txt(v_first, 'channel', 20), analytics_txt(v_first, 'utm_source', 40), analytics_txt(v_first, 'utm_medium', 40),
          analytics_txt(v_first, 'utm_campaign', 60), analytics_txt(v_first, 'utm_content', 60), analytics_txt(v_first, 'utm_term', 60),
          analytics_txt(v_first, 'referrer_host', 60), analytics_txt(v_first, 'landing', 40), coalesce(analytics_bool(v_first, 'has_click_id'), false),
          CASE WHEN analytics_txt(v_inst, 'ref_code', 16) ~ '^[0-9a-f]{6,16}$' THEN analytics_txt(v_inst, 'ref_code', 16) END,
          v_ref, (analytics_num(v_inst, 'consent_v'))::integer)
  ON CONFLICT (install_id) DO UPDATE SET last_seen = now(), last_version = coalesce(left(EXCLUDED.last_version, 20), analytics_installs.last_version);

  -- the sessions this batch refers to (their device details)
  IF jsonb_typeof(p_batch -> 'sessions') = 'object' THEN
    FOR sk, sv IN SELECT key, value FROM jsonb_each(p_batch -> 'sessions') LIMIT 50 LOOP
      CONTINUE WHEN sk !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR jsonb_typeof(sv) <> 'object';
      ctx := CASE WHEN jsonb_typeof(sv -> 'ctx') = 'object' THEN sv -> 'ctx' ELSE '{}'::jsonb END;
      lt := CASE WHEN jsonb_typeof(sv -> 'last') = 'object' THEN sv -> 'last' ELSE '{}'::jsonb END;
      INSERT INTO analytics_sessions (session_id, install_id, started_at, platform, version, build, os, os_major, browser, browser_major, form, screen_w, screen_h, dpr,
                                      portrait, touch, standalone, language, tz_offset, memory_gb, cores, connection, save_data, tier, dark, reduced_motion, webgl2,
                                      last_channel, last_source, last_medium, last_campaign, last_referrer)
      VALUES (sk::uuid, v_install,
              coalesce(to_timestamp(analytics_num(sv, 'started') / 1000.0) + v_skew, now()),
              left(analytics_txt(ctx, 'platform', 12), 12), analytics_txt(ctx, 'version', 20), analytics_txt(ctx, 'build', 20), analytics_txt(ctx, 'os', 20),
              analytics_num(ctx, 'os_major')::integer, analytics_txt(ctx, 'browser', 20), analytics_num(ctx, 'browser_major')::integer, analytics_txt(ctx, 'form', 12),
              analytics_num(ctx, 'screen_w')::integer, analytics_num(ctx, 'screen_h')::integer, analytics_num(ctx, 'dpr')::real, analytics_bool(ctx, 'portrait'),
              analytics_bool(ctx, 'touch'), analytics_bool(ctx, 'standalone'), analytics_txt(ctx, 'language', 12), analytics_num(ctx, 'tz_offset')::real,
              analytics_num(ctx, 'memory_gb')::integer, analytics_num(ctx, 'cores')::integer, analytics_txt(ctx, 'connection', 12), analytics_bool(ctx, 'save_data'),
              CASE WHEN analytics_txt(ctx, 'tier', 8) IN ('low', 'medium', 'high') THEN analytics_txt(ctx, 'tier', 8) END,
              analytics_bool(ctx, 'dark'), analytics_bool(ctx, 'reduced_motion'), analytics_bool(ctx, 'webgl2'),
              analytics_txt(lt, 'channel', 20), analytics_txt(lt, 'utm_source', 40), analytics_txt(lt, 'utm_medium', 40), analytics_txt(lt, 'utm_campaign', 60),
              analytics_txt(lt, 'referrer_host', 60))
      ON CONFLICT (session_id) DO NOTHING;
    END LOOP;
  END IF;

  -- the events
  FOR ev IN SELECT value FROM jsonb_array_elements(p_batch -> 'events') LOOP
    v_name := ev ->> 'n';
    IF jsonb_typeof(ev) <> 'object' OR v_name IS NULL OR v_name !~ '^[a-z0-9_]{2,48}$'
       OR coalesce(ev ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR jsonb_typeof(ev -> 't') <> 'number' THEN
      v_rejected := v_rejected + 1;
      CONTINUE;
    END IF;
    v_props := CASE WHEN jsonb_typeof(ev -> 'p') = 'object' THEN ev -> 'p' ELSE '{}'::jsonb END;
    IF octet_length(v_props::text) > 6000 THEN v_rejected := v_rejected + 1; CONTINUE; END IF;
    v_event_id := (ev ->> 'id')::uuid;
    v_session := CASE WHEN coalesce(ev ->> 's', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (ev ->> 's')::uuid END;
    v_ts := to_timestamp((ev ->> 't')::numeric / 1000.0) + v_skew;
    IF v_ts > now() + interval '5 minutes' THEN v_ts := now(); END IF;
    IF v_ts < now() - interval '10 days' THEN v_rejected := v_rejected + 1; CONTINUE; END IF;
    v_rate := CASE WHEN jsonb_typeof(ev -> 'r') = 'number' AND (ev ->> 'r')::numeric > 0 AND (ev ->> 'r')::numeric <= 1 THEN (ev ->> 'r')::real ELSE 1 END;
    INSERT INTO analytics_events (event_id, install_id, session_id, name, ts, seq, sample_rate, props, experiments)
    VALUES (v_event_id, v_install, v_session, v_name, v_ts, (analytics_num(ev, 'q'))::integer, v_rate, v_props,
            CASE WHEN jsonb_typeof(ev -> 'x') = 'object' AND octet_length((ev -> 'x')::text) < 600 THEN ev -> 'x' END)
    ON CONFLICT (event_id) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_accepted := v_accepted + v_rows;
  END LOOP;

  UPDATE analytics_installs SET events_total = events_total + v_accepted, last_seen = now() WHERE install_id = v_install;
  RETURN jsonb_build_object('accepted', v_accepted, 'duplicates', v_count - v_accepted - v_rejected, 'rejected', v_rejected,
                            'now', (extract(epoch FROM now()) * 1000)::bigint);
END;
$$;

-- ==================== ERASE AN INSTALL ====================
-- "Delete my analytics data" in Settings. The install id is a secret only that device knows.

CREATE OR REPLACE FUNCTION delete_analytics(p_install uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF p_install IS NULL THEN RETURN; END IF;
  DELETE FROM analytics_events WHERE install_id = p_install;
  DELETE FROM analytics_sessions WHERE install_id = p_install;
  DELETE FROM analytics_limits WHERE install_id = p_install;
  DELETE FROM analytics_installs WHERE install_id = p_install;
END;
$$;

-- ==================== THE ANONYMOUS YES / NO TALLY ====================
-- Counts how many times the question was shown and answered, with no id of any kind, so the rate of yes is known
-- even for people who said no.

CREATE OR REPLACE FUNCTION count_consent(p_outcome text, p_source text DEFAULT '', p_platform text DEFAULT '', p_version text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
BEGIN
  IF p_outcome NOT IN ('shown', 'granted', 'denied') THEN RETURN; END IF;
  -- one global cap per hour so the tally cannot be inflated by a script
  IF (SELECT coalesce(sum(n), 0) FROM analytics_consent_counts WHERE day = current_date) > 200000 THEN RETURN; END IF;
  INSERT INTO analytics_consent_counts (day, outcome, source, platform, version, n)
  VALUES (current_date, p_outcome, left(coalesce(p_source, ''), 12), left(coalesce(p_platform, ''), 12), left(coalesce(p_version, ''), 20), 1)
  ON CONFLICT (day, outcome, source, platform, version) DO UPDATE SET n = analytics_consent_counts.n + 1;
END;
$$;

-- ==================== RETENTION OF RAW DATA ====================
-- Owner only. Run on a schedule (Supabase: Database -> Cron) e.g.  SELECT analytics_purge(400);
-- Removes raw events older than the given number of days, rate-limit rows older than two days, and installs
-- that have been silent for that long. Daily summaries should be copied elsewhere first if they are wanted for longer.

CREATE OR REPLACE FUNCTION analytics_purge(p_days integer DEFAULT 400) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE
  e integer; l integer; s integer; i integer;
BEGIN
  p_days := greatest(30, coalesce(p_days, 400));
  DELETE FROM analytics_events WHERE ts < now() - make_interval(days => p_days);
  GET DIAGNOSTICS e = ROW_COUNT;
  DELETE FROM analytics_limits WHERE hour < now() - interval '2 days';
  GET DIAGNOSTICS l = ROW_COUNT;
  DELETE FROM analytics_sessions WHERE started_at < now() - make_interval(days => p_days);
  GET DIAGNOSTICS s = ROW_COUNT;
  DELETE FROM analytics_installs WHERE last_seen < now() - make_interval(days => p_days);
  GET DIAGNOSTICS i = ROW_COUNT;
  RETURN jsonb_build_object('events', e, 'limits', l, 'sessions', s, 'installs', i);
END;
$$;

-- ==================== PERMISSIONS ====================

REVOKE ALL ON FUNCTION ingest_analytics(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION delete_analytics(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION count_consent(text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION analytics_purge(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ingest_analytics(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_analytics(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION count_consent(text, text, text, text) TO anon, authenticated;

-- Internal helpers and the owner's clean-up job: never callable by the app roles (see the note in schema.sql)
REVOKE ALL ON FUNCTION analytics_txt(jsonb, text, integer), analytics_num(jsonb, text), analytics_bool(jsonb, text) FROM PUBLIC, anon, authenticated;

-- ===================================================================================================================
-- from database/analytics_views.sql
-- ===================================================================================================================

-- ================================================================
-- Language Dash — analytics views: everything worth asking, as ready-made tables.
--
-- Run after analytics.sql. Safe to run again. Nothing here is readable by the app: only the project owner (the SQL
-- editor, or the service role key used by tools/analytics-report.mjs) can read the views.
-- Times are UTC days. "Mature" in a retention column means the install is old enough for that day to have happened.
-- docs/ANALYTICS.md explains what each view answers and which decisions it is for.
-- ================================================================

CREATE OR REPLACE FUNCTION analytics_pct(n numeric, d numeric) RETURNS numeric
LANGUAGE sql IMMUTABLE SET search_path = language_dash, pg_temp
AS $$ SELECT CASE WHEN coalesce(d, 0) = 0 THEN NULL ELSE round(100.0 * coalesce(n, 0) / d, 1) END $$;
REVOKE ALL ON FUNCTION analytics_pct(numeric, numeric) FROM PUBLIC, anon, authenticated; -- (an internal helper, not for the app roles)

-- ==================== BUILDING BLOCKS (other views are made from these) ====================

-- one row per run that ended
CREATE OR REPLACE VIEW analytics_v_runs AS
SELECT e.id, e.install_id, e.session_id, e.ts, e.ts::date AS day,
       e.props ->> 'run_id' AS run_id, e.props ->> 'mode' AS mode, e.props ->> 'reason' AS reason,
       analytics_num(e.props, 'duration_s') AS duration_s, analytics_num(e.props, 'active_s') AS active_s, analytics_num(e.props, 'paused_s') AS paused_s,
       analytics_num(e.props, 'pauses') AS pauses, analytics_num(e.props, 'score') AS score, analytics_num(e.props, 'answered') AS answered,
       analytics_num(e.props, 'correct') AS correct, analytics_num(e.props, 'wrong') AS wrong, analytics_num(e.props, 'accuracy') AS accuracy,
       analytics_num(e.props, 'best_streak') AS best_streak, analytics_num(e.props, 'avg_decision_ms') AS avg_decision_ms,
       analytics_num(e.props, 'median_decision_ms') AS median_decision_ms, analytics_num(e.props, 'fastest_decision_ms') AS fastest_decision_ms,
       analytics_num(e.props, 'rushes') AS rushes, analytics_num(e.props, 'auto_pilots') AS auto_pilots,
       analytics_num(e.props, 'obstacles_jumped') AS obstacles_jumped, analytics_num(e.props, 'obstacles_slid') AS obstacles_slid,
       analytics_num(e.props, 'obstacles_hit') AS obstacles_hit, analytics_num(e.props, 'lives_start') AS lives_start,
       analytics_num(e.props, 'lives_lost') AS lives_lost, analytics_num(e.props, 'lives_lost_gate') AS lives_lost_gate,
       analytics_num(e.props, 'lives_lost_obstacle') AS lives_lost_obstacle, analytics_num(e.props, 'coins_pickup') AS coins_pickup,
       analytics_num(e.props, 'coins_total') AS coins_total, analytics_num(e.props, 'coins_air') AS coins_air,
       analytics_num(e.props, 'coin_chain_max') AS coin_chain_max, analytics_num(e.props, 'secrets') AS secrets,
       analytics_bool(e.props, 'continue_offered') AS continue_offered, analytics_bool(e.props, 'continued') AS continued,
       analytics_bool(e.props, 'monster_caught') AS monster_caught, analytics_num(e.props, 'map_changes') AS map_changes,
       analytics_num(e.props, 'speed_start') AS speed_start, analytics_num(e.props, 'speed_end') AS speed_end, analytics_num(e.props, 'xp_gain') AS xp_gain,
       analytics_num(e.props, 'level_before') AS level_before, analytics_num(e.props, 'level_after') AS level_after,
       analytics_bool(e.props, 'new_best') AS new_best, analytics_bool(e.props, 'ranked') AS ranked, analytics_bool(e.props, 'custom') AS custom,
       analytics_num(e.props, 'unique_cards') AS unique_cards, analytics_num(e.props, 'fps_avg') AS fps_avg, analytics_num(e.props, 'fps_p5') AS fps_p5,
       e.props ->> 'tier_end' AS tier_end, analytics_num(e.props, 'run_number') AS run_number, analytics_num(e.props, 'session_run_index') AS session_run_index,
       analytics_num(e.props, 'coins_wallet_after') AS wallet_after,
       e.props -> 'powerups' AS powerups, e.props -> 'fusions' AS fusions, e.props -> 'hazards' AS hazards, e.props -> 'subjects' AS subjects,
       e.props -> 'subject_correct' AS subject_correct, e.props -> 'maps' AS maps
FROM analytics_events e WHERE e.name = 'run_end';

-- one row per run that started
CREATE OR REPLACE VIEW analytics_v_run_starts AS
SELECT e.id, e.install_id, e.session_id, e.ts, e.ts::date AS day,
       e.props ->> 'run_id' AS run_id, e.props ->> 'mode' AS mode, analytics_num(e.props, 'run_number') AS run_number,
       e.props ->> 'map' AS map, e.props ->> 'hero' AS hero, e.props ->> 'monster' AS monster, e.props ->> 'trail' AS trail,
       analytics_num(e.props, 'speed_dial') AS speed_dial, analytics_num(e.props, 'lives') AS lives,
       analytics_num(e.props, 'subjects_selected') AS subjects_selected, analytics_num(e.props, 'subjects_total') AS subjects_total,
       analytics_num(e.props, 'pool_size') AS pool_size, analytics_bool(e.props, 'relaxed_pace') AS relaxed_pace, analytics_bool(e.props, 'ranked') AS ranked,
       e.props ->> 'input' AS input, e.props ->> 'dash_control' AS dash_control, e.props ->> 'camera' AS camera, e.props ->> 'tier' AS tier,
       analytics_bool(e.props, 'music') AS music, analytics_bool(e.props, 'sfx') AS sfx, analytics_bool(e.props, 'haptics') AS haptics,
       analytics_bool(e.props, 'tts') AS tts, analytics_bool(e.props, 'night') AS night, analytics_bool(e.props, 'colorblind') AS colorblind,
       analytics_bool(e.props, 'dyslexia') AS dyslexia, analytics_bool(e.props, 'lefty') AS lefty, analytics_bool(e.props, 'reduced_motion') AS reduced_motion,
       analytics_bool(e.props, 'online') AS online, analytics_num(e.props, 'minutes_since_last_run') AS minutes_since_last_run,
       analytics_num(e.props, 'coins') AS coins, analytics_num(e.props, 'level') AS level, analytics_num(e.props, 'streak_days') AS streak_days,
       e.props -> 'custom_rules' AS custom_rules
FROM analytics_events e WHERE e.name = 'run_start';

-- the last summary of each session (the app sends one every time it is hidden, so the last one wins)
CREATE OR REPLACE VIEW analytics_v_session_summary AS
WITH last_end AS (
  SELECT DISTINCT ON (session_id) session_id, ts, props
  FROM analytics_events WHERE name = 'session_end' AND session_id IS NOT NULL
  ORDER BY session_id, ts DESC
)
SELECT s.session_id, s.install_id, s.started_at, s.started_at::date AS day, s.platform, s.version, s.os, s.os_major, s.browser, s.form, s.tier, s.language,
       s.tz_offset, s.screen_w, s.screen_h, s.connection, s.standalone, s.last_channel, s.last_source,
       analytics_num(l.props, 'duration_s') AS duration_s, analytics_num(l.props, 'active_s') AS active_s, analytics_num(l.props, 'runs') AS runs,
       analytics_num(l.props, 'answers') AS answers, analytics_num(l.props, 'screens') AS screens, analytics_num(l.props, 'errors') AS errors,
       analytics_bool(l.props, 'in_run') AS ended_in_run, l.props ->> 'last_screen' AS last_screen
FROM analytics_sessions s LEFT JOIN last_end l ON l.session_id = s.session_id;

-- the days each install was active
CREATE OR REPLACE VIEW analytics_v_active_days AS
SELECT DISTINCT install_id, ts::date AS day FROM analytics_events WHERE name = 'session_start';

-- the latest snapshot of each install's progress
CREATE OR REPLACE VIEW analytics_v_latest_snapshot AS
SELECT DISTINCT ON (install_id) install_id, ts,
       analytics_num(props, 'level') AS level, analytics_num(props, 'xp') AS xp, analytics_num(props, 'coins') AS coins,
       analytics_num(props, 'streak_days') AS streak_days, analytics_num(props, 'best_streak_days') AS best_streak_days,
       analytics_num(props, 'runs_total') AS runs_total, analytics_num(props, 'answered_total') AS answered_total,
       analytics_num(props, 'correct_total') AS correct_total, analytics_num(props, 'owned_items') AS owned_items,
       analytics_num(props, 'owned_maps') AS owned_maps, analytics_num(props, 'achievements') AS achievements,
       analytics_num(props, 'subjects_selected') AS subjects_selected, analytics_num(props, 'custom_cards') AS custom_cards,
       analytics_bool(props, 'has_account') AS has_account, analytics_bool(props, 'reminders_on') AS reminders_on,
       analytics_bool(props, 'exam_date_set') AS exam_date_set, analytics_bool(props, 'study_plan') AS study_plan,
       analytics_num(props, 'days_since_install') AS days_since_install, analytics_num(props, 'fsrs_due') AS fsrs_due
FROM analytics_events WHERE name = 'user_snapshot' ORDER BY install_id, ts DESC;

-- ==================== 1. GROWTH AT A GLANCE ====================

-- every day: new installs, active installs, sessions, runs, answers
CREATE OR REPLACE VIEW analytics_v_daily_overview AS
WITH days AS (SELECT d::date AS day FROM generate_series(
       (SELECT coalesce(min(first_seen)::date, current_date) FROM analytics_installs), current_date, interval '1 day') d),
new_installs AS (SELECT first_seen::date AS day, count(*) AS n FROM analytics_installs GROUP BY 1),
act AS (SELECT day, count(*) AS dau FROM analytics_v_active_days GROUP BY 1),
sess AS (SELECT day, count(*) AS sessions, round(avg(duration_s)) AS avg_session_s FROM analytics_v_session_summary GROUP BY 1),
runs AS (SELECT day, count(*) AS runs, sum(answered) AS answers, sum(correct) AS correct, sum(coins_pickup) AS coins_picked FROM analytics_v_runs GROUP BY 1)
SELECT d.day, coalesce(n.n, 0) AS new_installs, coalesce(a.dau, 0) AS dau, coalesce(s.sessions, 0) AS sessions, s.avg_session_s,
       coalesce(r.runs, 0) AS runs, coalesce(r.answers, 0) AS answers, analytics_pct(r.correct, r.answers) AS accuracy_pct, coalesce(r.coins_picked, 0) AS coins_picked,
       round(coalesce(r.runs, 0)::numeric / nullif(a.dau, 0), 2) AS runs_per_active_install
FROM days d LEFT JOIN new_installs n USING (day) LEFT JOIN act a USING (day) LEFT JOIN sess s USING (day) LEFT JOIN runs r USING (day)
ORDER BY d.day;

-- daily, weekly and monthly active installs and how sticky the app is
CREATE OR REPLACE VIEW analytics_v_stickiness AS
WITH days AS (SELECT d::date AS day FROM generate_series(
       (SELECT coalesce(min(day), current_date) FROM analytics_v_active_days), current_date, interval '1 day') d)
SELECT d.day,
       count(DISTINCT a.install_id) FILTER (WHERE a.day = d.day) AS dau,
       count(DISTINCT a.install_id) FILTER (WHERE a.day BETWEEN d.day - 6 AND d.day) AS wau,
       count(DISTINCT a.install_id) AS mau,
       analytics_pct(count(DISTINCT a.install_id) FILTER (WHERE a.day = d.day), count(DISTINCT a.install_id)) AS dau_over_mau_pct
FROM days d LEFT JOIN analytics_v_active_days a ON a.day BETWEEN d.day - 29 AND d.day
GROUP BY d.day ORDER BY d.day;

-- ==================== 2. RETENTION ====================

-- by the day each install arrived: how many came back on day 1, 2, 3, 7, 14, 30
CREATE OR REPLACE VIEW analytics_v_retention AS
WITH cohort AS (SELECT install_id, first_seen::date AS d0 FROM analytics_installs)
SELECT c.d0 AS cohort_day, count(DISTINCT c.install_id) AS installs,
       count(DISTINCT c.install_id) FILTER (WHERE a.day - c.d0 = 1) AS d1,
       count(DISTINCT c.install_id) FILTER (WHERE a.day - c.d0 = 2) AS d2,
       count(DISTINCT c.install_id) FILTER (WHERE a.day - c.d0 = 3) AS d3,
       count(DISTINCT c.install_id) FILTER (WHERE a.day - c.d0 = 7) AS d7,
       count(DISTINCT c.install_id) FILTER (WHERE a.day - c.d0 = 14) AS d14,
       count(DISTINCT c.install_id) FILTER (WHERE a.day - c.d0 = 30) AS d30,
       analytics_pct(count(DISTINCT c.install_id) FILTER (WHERE a.day - c.d0 = 1), count(DISTINCT c.install_id)) AS d1_pct,
       analytics_pct(count(DISTINCT c.install_id) FILTER (WHERE a.day - c.d0 = 7), count(DISTINCT c.install_id)) AS d7_pct,
       analytics_pct(count(DISTINCT c.install_id) FILTER (WHERE a.day - c.d0 = 30), count(DISTINCT c.install_id)) AS d30_pct,
       current_date - c.d0 AS days_old
FROM cohort c LEFT JOIN analytics_v_active_days a ON a.install_id = c.install_id AND a.day >= c.d0
GROUP BY c.d0 ORDER BY c.d0;

-- retention by where installs came from, counting only installs old enough for each day
CREATE OR REPLACE VIEW analytics_v_retention_by_channel AS
WITH cohort AS (SELECT install_id, first_seen::date AS d0, coalesce(first_channel, 'unknown') AS channel, coalesce(first_source, '') AS source,
                       coalesce(platform, '') AS platform FROM analytics_installs)
SELECT c.channel, c.source, c.platform, count(DISTINCT c.install_id) AS installs,
       analytics_pct(count(DISTINCT c.install_id) FILTER (WHERE a.day - c.d0 = 1), count(DISTINCT c.install_id) FILTER (WHERE c.d0 <= current_date - 1)) AS d1_pct,
       analytics_pct(count(DISTINCT c.install_id) FILTER (WHERE a.day - c.d0 = 7), count(DISTINCT c.install_id) FILTER (WHERE c.d0 <= current_date - 7)) AS d7_pct,
       analytics_pct(count(DISTINCT c.install_id) FILTER (WHERE a.day - c.d0 = 30), count(DISTINCT c.install_id) FILTER (WHERE c.d0 <= current_date - 30)) AS d30_pct
FROM cohort c LEFT JOIN analytics_v_active_days a ON a.install_id = c.install_id AND a.day >= c.d0
GROUP BY c.channel, c.source, c.platform ORDER BY installs DESC;

-- retention by app version and by platform
CREATE OR REPLACE VIEW analytics_v_retention_by_version AS
WITH cohort AS (SELECT install_id, first_seen::date AS d0, coalesce(first_version, '') AS version, coalesce(platform, '') AS platform FROM analytics_installs)
SELECT c.version, c.platform, count(DISTINCT c.install_id) AS installs,
       analytics_pct(count(DISTINCT c.install_id) FILTER (WHERE a.day - c.d0 = 1), count(DISTINCT c.install_id) FILTER (WHERE c.d0 <= current_date - 1)) AS d1_pct,
       analytics_pct(count(DISTINCT c.install_id) FILTER (WHERE a.day - c.d0 = 7), count(DISTINCT c.install_id) FILTER (WHERE c.d0 <= current_date - 7)) AS d7_pct
FROM cohort c LEFT JOIN analytics_v_active_days a ON a.install_id = c.install_id AND a.day >= c.d0
GROUP BY c.version, c.platform ORDER BY installs DESC;

-- how often active installs come back: days active in the last 28
CREATE OR REPLACE VIEW analytics_v_frequency AS
WITH per AS (SELECT install_id, count(*) AS days_active FROM analytics_v_active_days WHERE day > current_date - 28 GROUP BY 1)
SELECT CASE WHEN days_active = 1 THEN '1 day' WHEN days_active <= 3 THEN '2-3 days' WHEN days_active <= 7 THEN '4-7 days'
            WHEN days_active <= 14 THEN '8-14 days' ELSE '15+ days' END AS days_active_in_last_28,
       count(*) AS installs, analytics_pct(count(*), sum(count(*)) OVER ()) AS share_pct
FROM per GROUP BY 1 ORDER BY min(days_active);

-- people who have stopped coming: by how long since their last session and how far they got
CREATE OR REPLACE VIEW analytics_v_churn_risk AS
WITH last AS (SELECT install_id, max(day) AS last_day, count(*) AS days_active FROM analytics_v_active_days GROUP BY 1)
SELECT CASE WHEN current_date - l.last_day <= 1 THEN 'active (today or yesterday)' WHEN current_date - l.last_day <= 3 THEN 'cooling (2-3 days)'
            WHEN current_date - l.last_day <= 7 THEN 'at risk (4-7 days)' WHEN current_date - l.last_day <= 30 THEN 'lapsed (8-30 days)' ELSE 'gone (30+ days)' END AS state,
       CASE WHEN coalesce(s.level, 1) >= 10 THEN 'level 10+' WHEN coalesce(s.level, 1) >= 5 THEN 'level 5-9' ELSE 'level 1-4' END AS level_band,
       count(*) AS installs, round(avg(l.days_active), 1) AS avg_days_active, round(avg(s.streak_days), 1) AS avg_streak_days
FROM last l LEFT JOIN analytics_v_latest_snapshot s ON s.install_id = l.install_id
GROUP BY 1, 2 ORDER BY 1, 2;

-- ==================== 3. WHERE INSTALLS COME FROM (MARKETING) ====================

-- each channel / source / campaign: installs and what they did
CREATE OR REPLACE VIEW analytics_v_acquisition AS
WITH i AS (SELECT install_id, first_seen, coalesce(first_channel, 'unknown') AS channel, coalesce(first_source, '') AS source, coalesce(first_medium, '') AS medium,
                  coalesce(first_campaign, '') AS campaign, coalesce(platform, '') AS platform FROM analytics_installs),
runs AS (SELECT install_id, count(*) AS runs, min(ts) AS first_run FROM analytics_v_run_starts GROUP BY 1),
sess AS (SELECT install_id, count(*) AS sessions FROM analytics_sessions GROUP BY 1),
tut AS (SELECT DISTINCT install_id FROM analytics_events WHERE name = 'tutorial_ended' AND props ->> 'outcome' = 'finished'),
buy AS (SELECT DISTINCT install_id FROM analytics_events WHERE name = 'purchase'),
shr AS (SELECT DISTINCT install_id FROM analytics_events WHERE name = 'share'),
ret1 AS (SELECT DISTINCT i2.install_id FROM i i2 JOIN analytics_v_active_days a ON a.install_id = i2.install_id AND a.day - i2.first_seen::date = 1),
ret7 AS (SELECT DISTINCT i2.install_id FROM i i2 JOIN analytics_v_active_days a ON a.install_id = i2.install_id AND a.day - i2.first_seen::date = 7)
SELECT i.channel, i.source, i.medium, i.campaign, i.platform, count(*) AS installs,
       analytics_pct(count(r.install_id) FILTER (WHERE r.first_run < i.first_seen + interval '1 day'), count(*)) AS ran_in_first_day_pct,
       analytics_pct(count(t.install_id), count(*)) AS finished_tutorial_pct,
       round(avg(r.runs), 1) AS runs_per_install, round(avg(s.sessions), 1) AS sessions_per_install,
       analytics_pct(count(b.install_id), count(*)) AS purchased_pct, analytics_pct(count(sh.install_id), count(*)) AS shared_pct,
       analytics_pct(count(r1.install_id), count(*) FILTER (WHERE i.first_seen::date <= current_date - 1)) AS d1_pct,
       analytics_pct(count(r7.install_id), count(*) FILTER (WHERE i.first_seen::date <= current_date - 7)) AS d7_pct
FROM i LEFT JOIN runs r ON r.install_id = i.install_id LEFT JOIN sess s ON s.install_id = i.install_id LEFT JOIN tut t ON t.install_id = i.install_id
     LEFT JOIN buy b ON b.install_id = i.install_id LEFT JOIN shr sh ON sh.install_id = i.install_id
     LEFT JOIN ret1 r1 ON r1.install_id = i.install_id LEFT JOIN ret7 r7 ON r7.install_id = i.install_id
GROUP BY i.channel, i.source, i.medium, i.campaign, i.platform ORDER BY installs DESC;

-- new installs each week by channel
CREATE OR REPLACE VIEW analytics_v_installs_by_week AS
SELECT date_trunc('week', first_seen)::date AS week, coalesce(first_channel, 'unknown') AS channel, coalesce(platform, '') AS platform, count(*) AS installs
FROM analytics_installs GROUP BY 1, 2, 3 ORDER BY 1 DESC, 4 DESC;

-- landing pages and the sites that sent people
CREATE OR REPLACE VIEW analytics_v_landing AS
SELECT coalesce(first_landing, '') AS landing, coalesce(first_referrer, '(none)') AS referrer, count(*) AS installs
FROM analytics_installs GROUP BY 1, 2 ORDER BY installs DESC;

-- the web app's install prompt: offered -> installed
CREATE OR REPLACE VIEW analytics_v_pwa AS
SELECT date_trunc('week', e.ts)::date AS week, coalesce(s.browser, '') AS browser,
       count(DISTINCT e.install_id) FILTER (WHERE e.name = 'pwa_prompt_available') AS offered,
       count(DISTINCT e.install_id) FILTER (WHERE e.name = 'pwa_installed') AS installed
FROM analytics_events e LEFT JOIN analytics_sessions s ON s.session_id = e.session_id
WHERE e.name IN ('pwa_prompt_available', 'pwa_installed') GROUP BY 1, 2 ORDER BY 1 DESC;

-- sharing and virality: shares, referred installs, and a rough viral coefficient
CREATE OR REPLACE VIEW analytics_v_virality AS
WITH shares AS (SELECT date_trunc('week', ts)::date AS week, props ->> 'kind' AS kind, count(*) AS shares, count(DISTINCT install_id) AS sharers,
                       count(*) FILTER (WHERE analytics_bool(props, 'ok')) AS shares_ok
                FROM analytics_events WHERE name = 'share' GROUP BY 1, 2),
referred AS (SELECT date_trunc('week', first_seen)::date AS week, count(*) AS referred_installs FROM analytics_installs WHERE referred_by_code IS NOT NULL OR first_channel = 'share' GROUP BY 1),
active AS (SELECT date_trunc('week', day)::date AS week, count(DISTINCT install_id) AS active_installs FROM analytics_v_active_days GROUP BY 1)
SELECT s.week, s.kind, s.shares, s.shares_ok, s.sharers, coalesce(r.referred_installs, 0) AS referred_installs_that_week, a.active_installs,
       round(coalesce(r.referred_installs, 0)::numeric / nullif(a.active_installs, 0), 3) AS referred_per_active_install
FROM shares s LEFT JOIN referred r USING (week) LEFT JOIN active a USING (week) ORDER BY s.week DESC, s.shares DESC;

-- who brought the most new players (by share code); no names, just the code
CREATE OR REPLACE VIEW analytics_v_top_referrers AS
SELECT r.ref_code, r.platform AS referrer_platform, r.events_total AS referrer_events, count(n.install_id) AS installs_brought,
       count(n.install_id) FILTER (WHERE EXISTS (SELECT 1 FROM analytics_events e WHERE e.install_id = n.install_id AND e.name = 'run_start')) AS who_played
FROM analytics_installs r JOIN analytics_installs n ON n.referred_by_code = r.ref_code
GROUP BY r.ref_code, r.platform, r.events_total ORDER BY installs_brought DESC;

-- the question about analytics itself: how many said yes
CREATE OR REPLACE VIEW analytics_v_consent AS
SELECT day, platform, version,
       sum(n) FILTER (WHERE outcome = 'shown') AS shown, sum(n) FILTER (WHERE outcome = 'granted') AS granted, sum(n) FILTER (WHERE outcome = 'denied') AS denied,
       analytics_pct(sum(n) FILTER (WHERE outcome = 'granted'), sum(n) FILTER (WHERE outcome IN ('granted', 'denied'))) AS opt_in_pct
FROM analytics_consent_counts GROUP BY day, platform, version ORDER BY day DESC;

-- ==================== 4. ONBOARDING: WHERE NEW PLAYERS DROP OFF ====================

-- one row: how many installs reached each step of the first experience
CREATE OR REPLACE VIEW analytics_v_onboarding_funnel AS
WITH reached AS (
  SELECT i.install_id,
    EXISTS (SELECT 1 FROM analytics_events e WHERE e.install_id = i.install_id AND e.name = 'tutorial_started') AS tutorial_started,
    EXISTS (SELECT 1 FROM analytics_events e WHERE e.install_id = i.install_id AND e.name = 'tutorial_ended' AND e.props ->> 'outcome' = 'finished') AS tutorial_finished,
    EXISTS (SELECT 1 FROM analytics_events e WHERE e.install_id = i.install_id AND e.name = 'run_start') AS run_started,
    EXISTS (SELECT 1 FROM analytics_events e WHERE e.install_id = i.install_id AND e.name = 'first_run_milestone' AND e.props ->> 'milestone' = 'correct_answer') AS first_correct,
    EXISTS (SELECT 1 FROM analytics_events e WHERE e.install_id = i.install_id AND e.name = 'run_end') AS run_ended,
    (SELECT count(*) FROM analytics_events e WHERE e.install_id = i.install_id AND e.name = 'run_end') >= 3 AS three_runs,
    EXISTS (SELECT 1 FROM analytics_events e WHERE e.install_id = i.install_id AND e.name = 'purchase') AS purchased,
    EXISTS (SELECT 1 FROM analytics_events e WHERE e.install_id = i.install_id AND e.name = 'quest_claimed') AS claimed_quest,
    EXISTS (SELECT 1 FROM analytics_v_active_days a WHERE a.install_id = i.install_id AND a.day > i.first_seen::date) AS came_back,
    EXISTS (SELECT 1 FROM analytics_v_active_days a WHERE a.install_id = i.install_id AND a.day - i.first_seen::date = 1) AS back_day_1
  FROM analytics_installs i)
SELECT count(*) AS installs,
       count(*) FILTER (WHERE tutorial_started) AS tutorial_started, count(*) FILTER (WHERE tutorial_finished) AS tutorial_finished,
       count(*) FILTER (WHERE run_started) AS run_started, count(*) FILTER (WHERE first_correct) AS first_correct_answer,
       count(*) FILTER (WHERE run_ended) AS first_run_finished, count(*) FILTER (WHERE three_runs) AS three_runs,
       count(*) FILTER (WHERE purchased) AS first_purchase, count(*) FILTER (WHERE claimed_quest) AS claimed_a_quest,
       count(*) FILTER (WHERE came_back) AS came_back_later, count(*) FILTER (WHERE back_day_1) AS back_on_day_1,
       analytics_pct(count(*) FILTER (WHERE tutorial_finished), count(*) FILTER (WHERE tutorial_started)) AS tutorial_completion_pct,
       analytics_pct(count(*) FILTER (WHERE run_started), count(*)) AS started_a_run_pct,
       analytics_pct(count(*) FILTER (WHERE came_back), count(*)) AS came_back_pct
FROM reached;

-- tutorial steps: how many viewed, finished, skipped, failed; how long they took
CREATE OR REPLACE VIEW analytics_v_tutorial_steps AS
SELECT coalesce(e.props ->> 'kind', '') AS kind, e.props ->> 'step' AS step, round(avg(analytics_num(e.props, 'index')), 1) AS position,
       count(DISTINCT e.install_id) FILTER (WHERE e.props ->> 'outcome' = 'viewed') AS viewed,
       count(DISTINCT e.install_id) FILTER (WHERE e.props ->> 'outcome' = 'completed') AS completed,
       count(DISTINCT e.install_id) FILTER (WHERE e.props ->> 'outcome' = 'skipped') AS skipped,
       count(DISTINCT e.install_id) FILTER (WHERE e.props ->> 'outcome' = 'failed') AS failed,
       analytics_pct(count(DISTINCT e.install_id) FILTER (WHERE e.props ->> 'outcome' = 'completed'), count(DISTINCT e.install_id) FILTER (WHERE e.props ->> 'outcome' = 'viewed')) AS completed_pct,
       round(avg(analytics_num(e.props, 'attempts')) FILTER (WHERE e.props ->> 'outcome' = 'completed'), 2) AS avg_attempts,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY analytics_num(e.props, 'ms')) FILTER (WHERE e.props ->> 'outcome' = 'completed') AS median_ms
FROM analytics_events e WHERE e.name = 'tutorial_step' GROUP BY 1, 2 ORDER BY 1, 3;

-- where the tutorial is left
CREATE OR REPLACE VIEW analytics_v_tutorial_exits AS
SELECT coalesce(props ->> 'kind', '') AS kind, props ->> 'outcome' AS outcome, coalesce(props ->> 'last_step', '(none)') AS last_step, count(*) AS tutorials,
       round(avg(analytics_num(props, 'steps_done')), 1) AS avg_steps_done, percentile_cont(0.5) WITHIN GROUP (ORDER BY analytics_num(props, 'ms')) AS median_ms,
       count(*) FILTER (WHERE analytics_bool(props, 'exit_confirm_shown')) AS saw_exit_question
FROM analytics_events WHERE name = 'tutorial_ended' GROUP BY 1, 2, 3 ORDER BY tutorials DESC;

-- how soon after install each first milestone is reached
CREATE OR REPLACE VIEW analytics_v_time_to_milestone AS
SELECT props ->> 'milestone' AS milestone, count(DISTINCT install_id) AS installs,
       percentile_cont(0.25) WITHIN GROUP (ORDER BY analytics_num(props, 'seconds_since_install')) AS p25_seconds,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY analytics_num(props, 'seconds_since_install')) AS median_seconds,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY analytics_num(props, 'seconds_since_install')) AS p90_seconds,
       round(avg(analytics_num(props, 'sessions_so_far')), 1) AS avg_sessions_so_far
FROM analytics_events WHERE name = 'first_run_milestone' GROUP BY 1 ORDER BY median_seconds;

-- the first session: how long, how many runs
CREATE OR REPLACE VIEW analytics_v_first_session AS
SELECT s.platform, count(*) AS first_sessions, percentile_cont(0.5) WITHIN GROUP (ORDER BY s.duration_s) AS median_seconds,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY s.duration_s) AS p90_seconds, round(avg(s.runs), 2) AS avg_runs, round(avg(s.answers), 1) AS avg_answers,
       analytics_pct(count(*) FILTER (WHERE coalesce(s.runs, 0) = 0), count(*)) AS no_run_pct, analytics_pct(count(*) FILTER (WHERE s.duration_s < 60), count(*)) AS under_a_minute_pct
FROM analytics_v_session_summary s
WHERE s.session_id IN (SELECT DISTINCT ON (install_id) session_id FROM analytics_sessions ORDER BY install_id, started_at)
GROUP BY s.platform ORDER BY first_sessions DESC;

-- ==================== 5. SESSIONS AND SCREENS ====================

CREATE OR REPLACE VIEW analytics_v_session_stats AS
SELECT day, platform, count(*) AS sessions, round(avg(duration_s)) AS avg_seconds, percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_s) AS median_seconds,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY duration_s) AS p90_seconds, round(avg(active_s)) AS avg_active_seconds, round(avg(runs), 2) AS runs_per_session,
       round(avg(answers), 1) AS answers_per_session, round(avg(screens), 1) AS screens_per_session,
       analytics_pct(count(*) FILTER (WHERE coalesce(runs, 0) = 0), count(*)) AS sessions_without_a_run_pct,
       analytics_pct(count(*) FILTER (WHERE coalesce(errors, 0) > 0), count(*)) AS sessions_with_error_pct
FROM analytics_v_session_summary GROUP BY day, platform ORDER BY day DESC, sessions DESC;

-- where sessions end (the last screen seen)
CREATE OR REPLACE VIEW analytics_v_session_exits AS
SELECT coalesce(last_screen, '(unknown)') AS last_screen, coalesce(ended_in_run, false) AS ended_in_a_run, count(*) AS sessions,
       analytics_pct(count(*), sum(count(*)) OVER ()) AS share_pct
FROM analytics_v_session_summary GROUP BY 1, 2 ORDER BY sessions DESC;

-- how many sessions a person has had, by days since install (are they coming back more than once a day?)
CREATE OR REPLACE VIEW analytics_v_sessions_per_active_day AS
SELECT day, round(count(*)::numeric / nullif(count(DISTINCT install_id), 0), 2) AS sessions_per_active_install, count(DISTINCT install_id) AS active_installs
FROM analytics_v_session_summary GROUP BY day ORDER BY day DESC;

CREATE OR REPLACE VIEW analytics_v_screens AS
SELECT ts::date AS day, props ->> 'screen' AS screen, count(*) AS views, count(DISTINCT install_id) AS installs,
       round(count(*)::numeric / nullif(count(DISTINCT session_id), 0), 2) AS views_per_session
FROM analytics_events WHERE name = 'screen_view' GROUP BY 1, 2 ORDER BY 1 DESC, views DESC;

-- how people move between screens
CREATE OR REPLACE VIEW analytics_v_screen_flow AS
SELECT coalesce(props ->> 'from', '(start)') AS from_screen, props ->> 'screen' AS to_screen, coalesce(props ->> 'via', '') AS via, count(*) AS moves,
       analytics_pct(count(*), sum(count(*)) OVER (PARTITION BY coalesce(props ->> 'from', '(start)'))) AS share_of_from_pct
FROM analytics_events WHERE name = 'screen_view' GROUP BY 1, 2, 3 ORDER BY moves DESC;

-- which tabs and pop-ups are used
CREATE OR REPLACE VIEW analytics_v_tabs_and_sheets AS
SELECT name AS kind, coalesce(props ->> 'screen', props ->> 'from', '') AS where_, coalesce(props ->> 'tab', props ->> 'kind') AS item, count(*) AS opens, count(DISTINCT install_id) AS installs
FROM analytics_events WHERE name IN ('tab_changed', 'sheet_opened') GROUP BY 1, 2, 3 ORDER BY opens DESC;

-- ==================== 6. FEATURE ADOPTION ====================

-- last 30 days: how many active installs used each feature at least once
CREATE OR REPLACE VIEW analytics_v_features AS
WITH feature(name, feature) AS (VALUES
  ('run_start', 'play a run'), ('flashcard_session', 'flashcards'), ('exam_started', 'exam simulator'), ('study_plan_changed', 'study plan / exam date'),
  ('custom_card', 'own cards'), ('anki_import', 'Anki import'), ('deck_shared', 'shared decks'), ('locker_opened', 'Locker'), ('purchase', 'buying items'),
  ('item_equipped', 'equipping items'), ('quest_claimed', 'claiming quests'), ('quest_swapped', 'swapping quests'), ('daily_reward_claimed', 'daily login reward'),
  ('share', 'sharing'), ('challenge_event', 'challenges'), ('multiplayer_event', 'versus'), ('leaderboard_viewed', 'leaderboard'), ('friend_event', 'friends'),
  ('setting_changed', 'changing settings'), ('review_session', 'quick review'), ('explain_viewed', 'explanations'), ('readiness_viewed', 'readiness view'),
  ('card_browser', 'card browser'), ('card_reported', 'reporting cards'), ('offline_pack', 'offline download'), ('account_event', 'account'),
  ('feedback_sent', 'sending feedback'), ('secret_found', 'finding secrets'), ('powerup_fused', 'power-up fusions'))
SELECT f.feature, count(DISTINCT e.install_id) AS installs, analytics_pct(count(DISTINCT e.install_id), (SELECT count(DISTINCT install_id) FROM analytics_v_active_days WHERE day > current_date - 30)) AS pct_of_active_installs,
       count(*) AS uses
FROM feature f JOIN analytics_events e ON e.name = f.name AND e.ts > now() - interval '30 days'
GROUP BY f.feature ORDER BY installs DESC;

-- each game mode: how much it is played and how it goes
CREATE OR REPLACE VIEW analytics_v_modes AS
SELECT mode, count(*) AS runs, count(DISTINCT install_id) AS installs, round(avg(duration_s)) AS avg_seconds, round(avg(score)) AS avg_score,
       round(avg(answered), 1) AS avg_answered, analytics_pct(sum(correct), sum(answered)) AS accuracy_pct,
       analytics_pct(count(*) FILTER (WHERE reason IN ('daily_complete', 'challenge_complete', 'race_finished')), count(*)) AS completed_pct,
       analytics_pct(count(*), sum(count(*)) OVER ()) AS share_of_runs_pct
FROM analytics_v_runs GROUP BY mode ORDER BY runs DESC;

-- modes players pick and cannot start (daily already done, no cards...)
CREATE OR REPLACE VIEW analytics_v_mode_blocked AS
SELECT props ->> 'mode' AS mode, coalesce(props ->> 'blocked', 'none') AS blocked, count(*) AS times, count(DISTINCT install_id) AS installs
FROM analytics_events WHERE name = 'mode_selected' GROUP BY 1, 2 ORDER BY times DESC;

-- ==================== 7. GAMEPLAY AND BALANCE ====================

CREATE OR REPLACE VIEW analytics_v_runs_daily AS
SELECT day, mode, count(*) AS runs, count(DISTINCT install_id) AS installs, round(avg(duration_s)) AS avg_seconds, round(avg(score)) AS avg_score,
       round(avg(answered), 1) AS avg_answered, analytics_pct(sum(correct), sum(answered)) AS accuracy_pct, round(avg(best_streak), 1) AS avg_best_streak,
       round(avg(coins_pickup)) AS avg_coins_picked, round(avg(lives_lost), 2) AS avg_lives_lost
FROM analytics_v_runs GROUP BY day, mode ORDER BY day DESC, runs DESC;

-- why runs end
CREATE OR REPLACE VIEW analytics_v_run_end_reasons AS
SELECT mode, coalesce(reason, 'unknown') AS reason, count(*) AS runs, analytics_pct(count(*), sum(count(*)) OVER (PARTITION BY mode)) AS share_of_mode_pct,
       round(avg(duration_s)) AS avg_seconds, round(avg(answered), 1) AS avg_answered
FROM analytics_v_runs GROUP BY mode, reason ORDER BY mode, runs DESC;

-- the first 30 runs: does the game get easier or harder, and who keeps going?
CREATE OR REPLACE VIEW analytics_v_difficulty_curve AS
WITH r AS (SELECT * FROM analytics_v_runs WHERE mode = 'endless' AND run_number BETWEEN 1 AND 30),
per AS (SELECT run_number, count(*) AS runs, count(DISTINCT install_id) AS installs, round(avg(duration_s)) AS avg_seconds, round(avg(answered), 1) AS avg_answered,
               analytics_pct(sum(correct), sum(answered)) AS accuracy_pct, round(avg(lives_lost), 2) AS avg_lives_lost, round(avg(score)) AS avg_score,
               round(avg(coins_pickup)) AS avg_coins_picked, analytics_pct(count(*) FILTER (WHERE monster_caught), count(*)) AS monster_caught_pct
        FROM r GROUP BY run_number)
SELECT p.*, analytics_pct(n.installs, p.installs) AS went_on_to_next_run_pct
FROM per p LEFT JOIN per n ON n.run_number = p.run_number + 1 ORDER BY p.run_number;

-- how the run was set up: input, graphics level, speed, camera
CREATE OR REPLACE VIEW analytics_v_run_setup AS
SELECT coalesce(s.input, 'unknown') AS input, coalesce(s.tier, 'unknown') AS tier, coalesce(s.camera, 'default') AS camera, coalesce(s.dash_control, 'auto') AS dash_control,
       count(*) AS runs, analytics_pct(sum(r.correct), sum(r.answered)) AS accuracy_pct, round(avg(r.duration_s)) AS avg_seconds, round(avg(r.lives_lost), 2) AS avg_lives_lost,
       analytics_pct(count(*) FILTER (WHERE r.reason = 'manual_end'), count(*)) AS quit_pct
FROM analytics_v_run_starts s JOIN analytics_v_runs r ON r.run_id = s.run_id AND r.install_id = s.install_id
GROUP BY 1, 2, 3, 4 ORDER BY runs DESC;

-- speed dial: what players choose and how it goes
CREATE OR REPLACE VIEW analytics_v_speed AS
SELECT s.speed_dial, count(*) AS runs, count(DISTINCT s.install_id) AS installs, analytics_pct(sum(r.correct), sum(r.answered)) AS accuracy_pct,
       round(avg(r.duration_s)) AS avg_seconds, round(avg(r.score)) AS avg_score, analytics_pct(count(*) FILTER (WHERE s.relaxed_pace), count(*)) AS relaxed_pace_pct
FROM analytics_v_run_starts s JOIN analytics_v_runs r ON r.run_id = s.run_id AND r.install_id = s.install_id
GROUP BY s.speed_dial ORDER BY s.speed_dial;

-- what takes lives: wrong gates, obstacles, the exam monster
CREATE OR REPLACE VIEW analytics_v_deaths AS
SELECT day, count(*) AS runs, sum(lives_lost) AS lives_lost, analytics_pct(sum(lives_lost_gate), sum(lives_lost)) AS from_wrong_answers_pct,
       analytics_pct(sum(lives_lost_obstacle), sum(lives_lost)) AS from_obstacles_pct, analytics_pct(count(*) FILTER (WHERE monster_caught), count(*)) AS runs_ending_in_monster_pct,
       analytics_pct(sum(obstacles_hit), sum(obstacles_hit + obstacles_jumped + obstacles_slid)) AS obstacles_hit_pct
FROM analytics_v_runs GROUP BY day ORDER BY day DESC;

-- the continue offer: shown, taken, and what it did to the run
CREATE OR REPLACE VIEW analytics_v_continue AS
SELECT date_trunc('week', ts)::date AS week, count(*) AS offers, count(*) FILTER (WHERE analytics_bool(props, 'accepted')) AS accepted,
       analytics_pct(count(*) FILTER (WHERE analytics_bool(props, 'accepted')), count(*)) AS accepted_pct,
       count(*) FILTER (WHERE NOT coalesce(analytics_bool(props, 'affordable'), true)) AS could_not_afford, round(avg(analytics_num(props, 'cost'))) AS avg_cost,
       round(avg(analytics_num(props, 'score'))) AS avg_score_at_offer
FROM analytics_events WHERE name = 'continue_prompt' GROUP BY 1 ORDER BY 1 DESC;

-- power-ups per run
CREATE OR REPLACE VIEW analytics_v_powerups AS
SELECT p.key AS powerup, count(*) AS runs_with_it, sum(p.value::numeric) AS collected, round(avg(p.value::numeric), 2) AS avg_per_run_that_had_it,
       analytics_pct(count(*), (SELECT count(*) FROM analytics_v_runs)) AS pct_of_runs
FROM analytics_v_runs r, LATERAL jsonb_each_text(CASE WHEN jsonb_typeof(r.powerups) = 'object' THEN r.powerups ELSE '{}'::jsonb END) AS p(key, value)
GROUP BY p.key ORDER BY collected DESC;

CREATE OR REPLACE VIEW analytics_v_fusions AS
SELECT p.key AS fusion, count(*) AS runs_with_it, sum(p.value::numeric) AS times
FROM analytics_v_runs r, LATERAL jsonb_each_text(CASE WHEN jsonb_typeof(r.fusions) = 'object' THEN r.fusions ELSE '{}'::jsonb END) AS p(key, value)
GROUP BY p.key ORDER BY times DESC;

CREATE OR REPLACE VIEW analytics_v_hazards AS
SELECT p.key AS hazard, count(*) AS runs, sum(p.value::numeric) AS times
FROM analytics_v_runs r, LATERAL jsonb_each_text(CASE WHEN jsonb_typeof(r.hazards) = 'object' THEN r.hazards ELSE '{}'::jsonb END) AS p(key, value)
GROUP BY p.key ORDER BY times DESC;

-- coins picked up on the track: how much, how often in the air, how long the chains are
CREATE OR REPLACE VIEW analytics_v_coin_stats AS
SELECT day, count(*) AS runs, round(avg(coins_pickup)) AS avg_picked, percentile_cont(0.5) WITHIN GROUP (ORDER BY coins_pickup) AS median_picked,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY coins_pickup) AS p90_picked, round(avg(coins_air), 1) AS avg_air_coins, round(avg(coin_chain_max), 1) AS avg_longest_chain,
       round(avg(coins_pickup / nullif(duration_s, 0) * 60)) AS avg_coins_per_minute
FROM analytics_v_runs GROUP BY day ORDER BY day DESC;

-- maps: how often they are played and how it goes
CREATE OR REPLACE VIEW analytics_v_maps AS
SELECT s.map, count(*) AS runs, count(DISTINCT s.install_id) AS installs, round(avg(r.duration_s)) AS avg_seconds, analytics_pct(sum(r.correct), sum(r.answered)) AS accuracy_pct,
       round(avg(r.lives_lost), 2) AS avg_lives_lost, analytics_pct(count(*), sum(count(*)) OVER ()) AS share_of_runs_pct
FROM analytics_v_run_starts s LEFT JOIN analytics_v_runs r ON r.run_id = s.run_id AND r.install_id = s.install_id
WHERE s.map IS NOT NULL GROUP BY s.map ORDER BY runs DESC;

CREATE OR REPLACE VIEW analytics_v_map_progress AS
SELECT name, props ->> 'map' AS map, coalesce(props ->> 'via', '') AS via, count(*) AS events, count(DISTINCT install_id) AS installs
FROM analytics_events WHERE name IN ('map_unlocked', 'secret_found') GROUP BY 1, 2, 3 ORDER BY events DESC;

-- heroes, monsters and trails in use
CREATE OR REPLACE VIEW analytics_v_cosmetics_in_use AS
SELECT 'hero' AS kind, hero AS item, count(*) AS runs, count(DISTINCT install_id) AS installs FROM analytics_v_run_starts WHERE hero IS NOT NULL GROUP BY 2
UNION ALL SELECT 'monster', monster, count(*), count(DISTINCT install_id) FROM analytics_v_run_starts WHERE monster IS NOT NULL GROUP BY 2
UNION ALL SELECT 'trail', trail, count(*), count(DISTINCT install_id) FROM analytics_v_run_starts WHERE trail IS NOT NULL GROUP BY 2
ORDER BY kind, runs DESC;

-- rules changed by the player (power-ups off, no hazards...) and how often
CREATE OR REPLACE VIEW analytics_v_custom_rules AS
SELECT r.value AS rule, count(*) AS runs, count(DISTINCT s.install_id) AS installs
FROM analytics_v_run_starts s, LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(s.custom_rules) = 'array' THEN s.custom_rules ELSE '[]'::jsonb END) AS r(value)
GROUP BY r.value ORDER BY runs DESC;

-- ==================== 8. CONTENT: WHAT PEOPLE KNOW AND WHAT TRIPS THEM ====================

-- per subject: questions answered and accuracy, from every run
CREATE OR REPLACE VIEW analytics_v_subjects AS
SELECT a.key AS subject, sum(a.value::numeric) AS answered, sum(coalesce(c.value::numeric, 0)) AS correct, analytics_pct(sum(coalesce(c.value::numeric, 0)), sum(a.value::numeric)) AS accuracy_pct,
       count(DISTINCT r.install_id) AS installs, round(sum(a.value::numeric) / nullif(count(DISTINCT r.install_id), 0), 1) AS answered_per_install
FROM analytics_v_runs r
JOIN LATERAL jsonb_each_text(CASE WHEN jsonb_typeof(r.subjects) = 'object' THEN r.subjects ELSE '{}'::jsonb END) AS a(key, value) ON true
LEFT JOIN LATERAL jsonb_each_text(CASE WHEN jsonb_typeof(r.subject_correct) = 'object' THEN r.subject_correct ELSE '{}'::jsonb END) AS c(key, value) ON c.key = a.key
GROUP BY a.key ORDER BY answered DESC;

-- how many subjects players keep on, and which exam filters they use
CREATE OR REPLACE VIEW analytics_v_subject_filters AS
SELECT coalesce(subjects_selected::text, '?') AS subjects_selected, count(*) AS runs, count(DISTINCT install_id) AS installs
FROM analytics_v_run_starts GROUP BY 1 ORDER BY 2 DESC;

CREATE OR REPLACE VIEW analytics_v_exam_filters AS
SELECT f.value AS exam_filter, count(*) AS runs, count(DISTINCT s.install_id) AS installs
FROM analytics_events s, LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(s.props -> 'exam_filters') = 'array' THEN s.props -> 'exam_filters' ELSE '[]'::jsonb END) AS f(value)
WHERE s.name = 'run_start' GROUP BY f.value ORDER BY runs DESC;

-- every card: how often it is asked, how often it is right, how long it takes (cards seen at least 10 times)
CREATE OR REPLACE VIEW analytics_v_card_difficulty AS
WITH rows AS (
  SELECT e.install_id, row_.value AS r FROM analytics_events e, LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(e.props -> 'rows') = 'array' THEN e.props -> 'rows' ELSE '[]'::jsonb END) AS row_(value)
  WHERE e.name = 'run_cards')
SELECT r ->> 0 AS card_id, count(*) AS asked, count(DISTINCT install_id) AS installs, round(avg((r ->> 1)::numeric) * 100, 1) AS correct_pct,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY (r ->> 2)::numeric) AS median_ms, round(avg((r ->> 6)::numeric) * 100, 1) AS dashed_pct
FROM rows GROUP BY 1 HAVING count(*) >= 10 ORDER BY correct_pct;

-- cards that are too easy (nearly always right, answered fast): candidates to retire or harden
CREATE OR REPLACE VIEW analytics_v_cards_too_easy AS
SELECT * FROM analytics_v_card_difficulty WHERE correct_pct >= 97 AND asked >= 30 ORDER BY asked DESC;

-- cards that are too hard or unfair (mostly wrong): candidates to rewrite
CREATE OR REPLACE VIEW analytics_v_cards_too_hard AS
SELECT * FROM analytics_v_card_difficulty WHERE correct_pct <= 35 AND asked >= 30 ORDER BY correct_pct;

-- which wrong answer players choose, per card: a distractor that wins more than chance is a sign the card is unclear
CREATE OR REPLACE VIEW analytics_v_card_distractors AS
WITH rows AS (
  SELECT e.install_id, row_.value AS r FROM analytics_events e, LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(e.props -> 'rows') = 'array' THEN e.props -> 'rows' ELSE '[]'::jsonb END) AS row_(value)
  WHERE e.name = 'run_cards')
SELECT r ->> 0 AS card_id, (r ->> 5)::int AS wrong_answer_index, count(*) AS times_chosen,
       analytics_pct(count(*), sum(count(*)) OVER (PARTITION BY r ->> 0)) AS share_of_wrong_answers_pct
FROM rows WHERE (r ->> 1)::int = 0 AND (r ->> 5)::int >= 0 GROUP BY 1, 2 HAVING count(*) >= 5 ORDER BY card_id, times_chosen DESC;

-- do players favour a lane regardless of the answer? (the correct lane is random, so the share should be even)
CREATE OR REPLACE VIEW analytics_v_lane_bias AS
WITH rows AS (
  SELECT row_.value AS r FROM analytics_events e, LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(e.props -> 'rows') = 'array' THEN e.props -> 'rows' ELSE '[]'::jsonb END) AS row_(value)
  WHERE e.name = 'run_cards')
SELECT (r ->> 3)::int AS lane_chosen, count(*) AS answers, analytics_pct(count(*), sum(count(*)) OVER ()) AS share_pct,
       count(*) FILTER (WHERE (r ->> 3) = (r ->> 4)) AS right_when_chosen, analytics_pct(count(*) FILTER (WHERE (r ->> 3) = (r ->> 4)), count(*)) AS accuracy_pct
FROM rows GROUP BY 1 ORDER BY 1;

-- how decision time relates to being right
CREATE OR REPLACE VIEW analytics_v_decision_time AS
WITH rows AS (
  SELECT row_.value AS r FROM analytics_events e, LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(e.props -> 'rows') = 'array' THEN e.props -> 'rows' ELSE '[]'::jsonb END) AS row_(value)
  WHERE e.name = 'run_cards')
SELECT CASE WHEN (r ->> 2)::numeric < 1000 THEN '< 1 s' WHEN (r ->> 2)::numeric < 2000 THEN '1-2 s' WHEN (r ->> 2)::numeric < 4000 THEN '2-4 s' WHEN (r ->> 2)::numeric < 8000 THEN '4-8 s' ELSE '8 s +' END AS decision_time,
       count(*) AS answers, analytics_pct(count(*) FILTER (WHERE (r ->> 1)::int = 1), count(*)) AS correct_pct
FROM rows GROUP BY 1 ORDER BY min((r ->> 2)::numeric);

CREATE OR REPLACE VIEW analytics_v_explanations AS
SELECT props ->> 'source' AS source, count(*) AS opened, count(DISTINCT install_id) AS installs, count(DISTINCT props ->> 'card_id') AS different_cards
FROM analytics_events WHERE name = 'explain_viewed' GROUP BY 1 ORDER BY opened DESC;

CREATE OR REPLACE VIEW analytics_v_card_reports AS
SELECT props ->> 'reason' AS reason, coalesce(props ->> 'source', '') AS source, count(*) AS reports, count(DISTINCT props ->> 'card_id') AS cards, count(DISTINCT install_id) AS installs
FROM analytics_events WHERE name = 'card_reported' GROUP BY 1, 2 ORDER BY reports DESC;

CREATE OR REPLACE VIEW analytics_v_most_reported_cards AS
SELECT props ->> 'card_id' AS card_id, count(*) AS reports, count(DISTINCT install_id) AS installs, mode() WITHIN GROUP (ORDER BY props ->> 'reason') AS main_reason
FROM analytics_events WHERE name = 'card_reported' AND props ->> 'card_id' IS NOT NULL GROUP BY 1 ORDER BY reports DESC;

CREATE OR REPLACE VIEW analytics_v_flashcards AS
SELECT ts::date AS day, coalesce(props ->> 'kind', 'other') AS kind, count(*) AS sessions, count(DISTINCT install_id) AS installs, round(avg(analytics_num(props, 'cards')), 1) AS avg_cards,
       analytics_pct(sum(analytics_num(props, 'correct')), sum(analytics_num(props, 'cards'))) AS correct_pct, round(avg(analytics_num(props, 'duration_s'))) AS avg_seconds
FROM analytics_events WHERE name = 'flashcard_session' GROUP BY 1, 2 ORDER BY 1 DESC;

CREATE OR REPLACE VIEW analytics_v_exam_sim AS
SELECT date_trunc('week', ts)::date AS week, count(*) FILTER (WHERE name = 'exam_started') AS started, count(*) FILTER (WHERE name = 'exam_ended' AND props ->> 'outcome' = 'finished') AS finished,
       count(*) FILTER (WHERE name = 'exam_ended' AND props ->> 'outcome' = 'left') AS left_early,
       analytics_pct(sum(analytics_num(props, 'correct')) FILTER (WHERE name = 'exam_ended'), sum(analytics_num(props, 'answered')) FILTER (WHERE name = 'exam_ended')) AS accuracy_pct,
       round(avg(analytics_num(props, 'duration_s')) FILTER (WHERE name = 'exam_ended')) AS avg_seconds
FROM analytics_events WHERE name IN ('exam_started', 'exam_ended') GROUP BY 1 ORDER BY 1 DESC;

CREATE OR REPLACE VIEW analytics_v_study_plans AS
SELECT props ->> 'action' AS action, count(*) AS events, count(DISTINCT install_id) AS installs, round(avg(analytics_num(props, 'days_out'))) AS avg_days_out,
       mode() WITHIN GROUP (ORDER BY props ->> 'exam') AS main_exam
FROM analytics_events WHERE name = 'study_plan_changed' GROUP BY 1 ORDER BY events DESC;

CREATE OR REPLACE VIEW analytics_v_custom_cards AS
SELECT props ->> 'action' AS action, count(*) AS events, count(DISTINCT install_id) AS installs, sum(coalesce(analytics_num(props, 'count'), 1)) AS cards
FROM analytics_events WHERE name IN ('custom_card', 'anki_import', 'deck_shared') GROUP BY 1 ORDER BY events DESC;

-- ==================== 9. ECONOMY ====================

-- coins in and out each day
CREATE OR REPLACE VIEW analytics_v_economy_daily AS
WITH picked AS (SELECT day, sum(coins_pickup) AS picked, sum(coins_total) AS run_total FROM analytics_v_runs GROUP BY 1),
other_in AS (SELECT ts::date AS day, sum(analytics_num(props, 'amount')) AS earned FROM analytics_events WHERE name = 'coins_earned' GROUP BY 1),
bought AS (SELECT ts::date AS day, sum(analytics_num(props, 'price')) AS spent_on_items, count(*) AS purchases FROM analytics_events WHERE name = 'purchase' GROUP BY 1),
other_out AS (SELECT ts::date AS day, sum(analytics_num(props, 'amount')) AS spent_other FROM analytics_events WHERE name = 'coins_spent' GROUP BY 1),
days AS (SELECT day FROM picked UNION SELECT day FROM other_in UNION SELECT day FROM bought UNION SELECT day FROM other_out)
SELECT d.day, coalesce(p.picked, 0) AS from_track_pickups, coalesce(p.run_total, 0) AS run_totals, coalesce(o.earned, 0) AS from_other_sources, coalesce(b.spent_on_items, 0) AS spent_on_items,
       coalesce(b.purchases, 0) AS purchases, coalesce(x.spent_other, 0) AS spent_on_continues_and_swaps,
       coalesce(p.picked, 0) + coalesce(o.earned, 0) - coalesce(b.spent_on_items, 0) - coalesce(x.spent_other, 0) AS net
FROM days d LEFT JOIN picked p USING (day) LEFT JOIN other_in o USING (day) LEFT JOIN bought b USING (day) LEFT JOIN other_out x USING (day) ORDER BY d.day DESC;

-- coins from sources outside runs
CREATE OR REPLACE VIEW analytics_v_coin_sources AS
SELECT props ->> 'source' AS source, count(*) AS events, count(DISTINCT install_id) AS installs, sum(analytics_num(props, 'amount')) AS coins, round(avg(analytics_num(props, 'amount'))) AS avg_amount
FROM analytics_events WHERE name = 'coins_earned' GROUP BY 1 ORDER BY coins DESC;

CREATE OR REPLACE VIEW analytics_v_coin_sinks AS
SELECT 'item: ' || coalesce(props ->> 'item_type', 'other') AS spent_on, count(*) AS purchases, count(DISTINCT install_id) AS installs, sum(analytics_num(props, 'price')) AS coins
FROM analytics_events WHERE name = 'purchase' GROUP BY 1
UNION ALL SELECT props ->> 'on', count(*), count(DISTINCT install_id), sum(analytics_num(props, 'amount')) FROM analytics_events WHERE name = 'coins_spent' GROUP BY 1 ORDER BY coins DESC;

-- every item: bought, previewed, equipped, wanted-but-too-dear
CREATE OR REPLACE VIEW analytics_v_items AS
WITH p AS (SELECT props ->> 'item_id' AS item, props ->> 'item_type' AS item_type, count(*) AS purchases, count(DISTINCT install_id) AS buyers, round(avg(analytics_num(props, 'price'))) AS price,
                  round(avg(analytics_num(props, 'days_since_install')), 1) AS avg_days_since_install, round(avg(analytics_num(props, 'coins_after'))) AS avg_coins_left
           FROM analytics_events WHERE name = 'purchase' GROUP BY 1, 2),
v AS (SELECT props ->> 'item_id' AS item, count(DISTINCT install_id) AS previewers FROM analytics_events WHERE name = 'item_previewed' GROUP BY 1),
b AS (SELECT props ->> 'item_id' AS item, count(*) AS blocked, count(DISTINCT install_id) AS blocked_installs, round(avg(analytics_num(props, 'short_by'))) AS avg_short_by
      FROM analytics_events WHERE name = 'purchase_blocked' GROUP BY 1),
q AS (SELECT props ->> 'item_id' AS item, count(*) AS equips, count(DISTINCT install_id) AS equippers FROM analytics_events WHERE name = 'item_equipped' GROUP BY 1)
SELECT coalesce(p.item, v.item, b.item, q.item) AS item, p.item_type, p.price, coalesce(p.purchases, 0) AS purchases, coalesce(p.buyers, 0) AS buyers, coalesce(v.previewers, 0) AS previewers,
       coalesce(b.blocked_installs, 0) AS tried_to_buy_without_coins, b.avg_short_by, coalesce(q.equippers, 0) AS equippers, p.avg_days_since_install, p.avg_coins_left,
       analytics_pct(p.buyers, v.previewers) AS preview_to_buy_pct
FROM p FULL JOIN v USING (item) FULL JOIN b USING (item) FULL JOIN q USING (item) ORDER BY purchases DESC NULLS LAST;

-- how soon people buy their first thing, and what it is
CREATE OR REPLACE VIEW analytics_v_first_purchase AS
WITH first_buy AS (SELECT DISTINCT ON (e.install_id) e.install_id, e.ts, e.props ->> 'item_id' AS item, analytics_num(e.props, 'price') AS price
                   FROM analytics_events e WHERE e.name = 'purchase' ORDER BY e.install_id, e.ts)
SELECT f.item, count(*) AS installs, round(avg(f.price)) AS price,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM f.ts - i.first_seen) / 3600) AS median_hours_after_install,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY extract(epoch FROM f.ts - i.first_seen) / 3600) AS p90_hours_after_install
FROM first_buy f JOIN analytics_installs i ON i.install_id = f.install_id GROUP BY f.item ORDER BY installs DESC;

-- how many coins players are sitting on, by how long they have played
CREATE OR REPLACE VIEW analytics_v_wallet AS
SELECT CASE WHEN days_since_install < 1 THEN 'day 0' WHEN days_since_install < 3 THEN 'days 1-2' WHEN days_since_install < 7 THEN 'days 3-6'
            WHEN days_since_install < 30 THEN 'days 7-29' ELSE 'day 30+' END AS install_age, count(*) AS installs,
       percentile_cont(0.25) WITHIN GROUP (ORDER BY coins) AS p25_coins, percentile_cont(0.5) WITHIN GROUP (ORDER BY coins) AS median_coins,
       percentile_cont(0.75) WITHIN GROUP (ORDER BY coins) AS p75_coins, round(avg(owned_items), 1) AS avg_owned_items,
       analytics_pct(count(*) FILTER (WHERE coins >= 500), count(*)) AS can_afford_500_pct, analytics_pct(count(*) FILTER (WHERE coins >= 2000), count(*)) AS can_afford_2000_pct
FROM analytics_v_latest_snapshot WHERE days_since_install IS NOT NULL GROUP BY 1 ORDER BY min(days_since_install);

-- when the coin supply does not match the shop: stuck players hoarding many coins and buying nothing
CREATE OR REPLACE VIEW analytics_v_hoarders AS
SELECT count(*) FILTER (WHERE coins >= 3000) AS hoarding_3000_plus, count(*) FILTER (WHERE coins >= 3000 AND owned_items <= 10) AS hoarding_and_few_items,
       count(*) AS installs, analytics_pct(count(*) FILTER (WHERE coins >= 3000), count(*)) AS hoarding_pct
FROM analytics_v_latest_snapshot;

-- quests
CREATE OR REPLACE VIEW analytics_v_quests AS
WITH c AS (SELECT props ->> 'id' AS quest, count(*) AS completed, count(DISTINCT install_id) AS completers FROM analytics_events WHERE name = 'quest_completed' GROUP BY 1),
k AS (SELECT props ->> 'id' AS quest, count(*) AS claimed, sum(analytics_num(props, 'reward')) AS coins_paid FROM analytics_events WHERE name = 'quest_claimed' GROUP BY 1),
s AS (SELECT props ->> 'from' AS quest, count(*) FILTER (WHERE analytics_bool(props, 'ok')) AS swapped_away, count(*) FILTER (WHERE NOT coalesce(analytics_bool(props, 'ok'), false)) AS swap_refused FROM analytics_events WHERE name = 'quest_swapped' GROUP BY 1)
SELECT coalesce(c.quest, k.quest, s.quest) AS quest, coalesce(c.completed, 0) AS completed, coalesce(k.claimed, 0) AS claimed, coalesce(k.coins_paid, 0) AS coins_paid,
       coalesce(s.swapped_away, 0) AS swapped_away, coalesce(s.swap_refused, 0) AS swap_refused,
       analytics_pct(coalesce(s.swapped_away, 0), coalesce(s.swapped_away, 0) + coalesce(c.completed, 0)) AS disliked_pct
FROM c FULL JOIN k USING (quest) FULL JOIN s USING (quest) ORDER BY swapped_away DESC NULLS LAST, completed DESC;

CREATE OR REPLACE VIEW analytics_v_quest_swaps AS
SELECT date_trunc('week', ts)::date AS week, count(*) AS tries, count(*) FILTER (WHERE analytics_bool(props, 'ok')) AS swapped,
       count(*) FILTER (WHERE props ->> 'reason' = 'not_enough_coins') AS not_enough_coins, round(avg(analytics_num(props, 'cost'))) AS avg_cost,
       round(avg(analytics_num(props, 'progress')), 2) AS avg_progress_when_swapped, count(DISTINCT install_id) AS installs
FROM analytics_events WHERE name = 'quest_swapped' GROUP BY 1 ORDER BY 1 DESC;

CREATE OR REPLACE VIEW analytics_v_daily_rewards AS
SELECT ts::date AS day, count(*) AS claims, count(DISTINCT install_id) AS installs, round(avg(analytics_num(props, 'login_streak')), 1) AS avg_login_streak,
       count(*) FILTER (WHERE analytics_bool(props, 'chest')) AS chests, sum(analytics_num(props, 'coins')) AS coins
FROM analytics_events WHERE name = 'daily_reward_claimed' GROUP BY 1 ORDER BY 1 DESC;

-- ==================== 10. PROGRESSION AND HABITS ====================

CREATE OR REPLACE VIEW analytics_v_levels AS
SELECT level::int AS level, count(*) AS installs, analytics_pct(count(*), sum(count(*)) OVER ()) AS share_pct, round(avg(runs_total), 1) AS avg_runs, round(avg(days_since_install), 1) AS avg_days_in
FROM analytics_v_latest_snapshot WHERE level IS NOT NULL GROUP BY 1 ORDER BY 1;

-- how long reaching each level takes
CREATE OR REPLACE VIEW analytics_v_time_to_level AS
SELECT analytics_num(e.props, 'level')::int AS level, count(*) AS installs,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM e.ts - i.first_seen) / 86400) AS median_days, percentile_cont(0.9) WITHIN GROUP (ORDER BY extract(epoch FROM e.ts - i.first_seen) / 86400) AS p90_days
FROM analytics_events e JOIN analytics_installs i ON i.install_id = e.install_id WHERE e.name = 'level_up' GROUP BY 1 ORDER BY 1;

CREATE OR REPLACE VIEW analytics_v_streaks AS
SELECT CASE WHEN streak_days = 0 THEN '0' WHEN streak_days <= 2 THEN '1-2' WHEN streak_days <= 6 THEN '3-6' WHEN streak_days <= 13 THEN '7-13' WHEN streak_days <= 29 THEN '14-29' ELSE '30+' END AS study_streak_days,
       count(*) AS installs, analytics_pct(count(*), sum(count(*)) OVER ()) AS share_pct
FROM analytics_v_latest_snapshot WHERE streak_days IS NOT NULL GROUP BY 1 ORDER BY min(streak_days);

CREATE OR REPLACE VIEW analytics_v_streak_events AS
SELECT props ->> 'kind' AS kind, count(*) AS events, count(DISTINCT install_id) AS installs, round(avg(analytics_num(props, 'days')), 1) AS avg_days
FROM analytics_events WHERE name = 'streak_changed' GROUP BY 1 ORDER BY events DESC;

CREATE OR REPLACE VIEW analytics_v_achievements AS
SELECT props ->> 'id' AS badge, count(*) AS earned, count(DISTINCT install_id) AS installs, analytics_pct(count(DISTINCT install_id), (SELECT count(*) FROM analytics_installs)) AS pct_of_installs
FROM analytics_events WHERE name = 'achievement_unlocked' GROUP BY 1 ORDER BY earned DESC;

CREATE OR REPLACE VIEW analytics_v_daily_goal AS
SELECT props ->> 'action' AS action, round(avg(analytics_num(props, 'goal'))) AS avg_goal, count(*) AS events, count(DISTINCT install_id) AS installs
FROM analytics_events WHERE name = 'daily_goal' GROUP BY 1;

-- ==================== 11. RATINGS, FEEDBACK, TIPS, NOTIFICATIONS ====================

CREATE OR REPLACE VIEW analytics_v_rating_funnel AS
SELECT props ->> 'step' AS step, coalesce(props ->> 'trigger', '') AS trigger, count(*) AS events, count(DISTINCT install_id) AS installs, round(avg(analytics_num(props, 'runs_total')), 1) AS avg_runs_at_prompt,
       round(avg(analytics_num(props, 'days_since_install')), 1) AS avg_days_at_prompt
FROM analytics_events WHERE name = 'rating_prompt' GROUP BY 1, 2 ORDER BY events DESC;

CREATE OR REPLACE VIEW analytics_v_feedback AS
SELECT props ->> 'mood' AS mood, count(*) AS sent, round(avg(analytics_num(props, 'length'))) AS avg_length, analytics_pct(count(*) FILTER (WHERE analytics_bool(props, 'has_contact')), count(*)) AS left_contact_pct
FROM analytics_events WHERE name = 'feedback_sent' GROUP BY 1 ORDER BY sent DESC;

CREATE OR REPLACE VIEW analytics_v_tip_funnel AS
SELECT props ->> 'step' AS step, coalesce(props ->> 'trigger', '') AS trigger, count(*) AS events, count(DISTINCT install_id) AS installs, round(avg(analytics_num(props, 'runs_total')), 1) AS avg_runs, round(avg(analytics_num(props, 'days_since_install')), 1) AS avg_days
FROM analytics_events WHERE name = 'tip_prompt' GROUP BY 1, 2 ORDER BY events DESC;

-- tips bought in the phone apps: by product and outcome, and the money that came in (completed tips only, by currency; before the store's cut)
CREATE OR REPLACE VIEW analytics_v_tip_revenue AS
SELECT coalesce(props ->> 'product', '') AS product, coalesce(props ->> 'currency', '') AS currency, props ->> 'outcome' AS outcome,
       count(*) AS events, count(DISTINCT install_id) AS installs,
       CASE WHEN props ->> 'outcome' = 'completed' THEN round(sum(analytics_num(props, 'micros')) / 1000000.0, 2) END AS total
FROM analytics_events WHERE name = 'tip_purchase' GROUP BY 1, 2, 3 ORDER BY 1, 3;

CREATE OR REPLACE VIEW analytics_v_reminders AS
SELECT props ->> 'action' AS action, coalesce(analytics_bool(props, 'native'), false) AS native, count(*) AS events, count(DISTINCT install_id) AS installs, round(avg(analytics_num(props, 'hour')), 1) AS avg_hour
FROM analytics_events WHERE name = 'reminder_state' GROUP BY 1, 2 ORDER BY events DESC;

CREATE OR REPLACE VIEW analytics_v_nudges AS
SELECT coalesce(props ->> 'kind', name) AS nudge, name AS source_event, count(*) AS shown, count(*) FILTER (WHERE analytics_bool(props, 'acted') OR analytics_bool(props, 'clicked')) AS acted,
       analytics_pct(count(*) FILTER (WHERE analytics_bool(props, 'acted') OR analytics_bool(props, 'clicked')), count(*)) AS acted_pct
FROM analytics_events WHERE name IN ('nudge_shown', 'next_goal_shown', 'review_tip') GROUP BY 1, 2 ORDER BY shown DESC;

-- days on which a player finished every quest, and how that spreads over the install's first weeks
CREATE OR REPLACE VIEW analytics_v_quests_all_done AS
SELECT ts::date AS day, count(*) AS completions, count(DISTINCT install_id) AS installs, round(avg(analytics_num(props, 'count')), 1) AS avg_quests
FROM analytics_events WHERE name = 'quests_all_done' GROUP BY 1 ORDER BY 1 DESC;

-- cloud save: how often it syncs, in which direction, and how often it fails
CREATE OR REPLACE VIEW analytics_v_cloud_sync AS
SELECT props ->> 'direction' AS direction, coalesce(analytics_bool(props, 'ok'), false) AS ok, count(*) AS events, count(DISTINCT install_id) AS installs
FROM analytics_events WHERE name = 'cloud_sync' GROUP BY 1, 2 ORDER BY events DESC;

-- the ranked ladder: views, promotions, demotions
CREATE OR REPLACE VIEW analytics_v_ranked AS
SELECT props ->> 'action' AS action, count(*) AS events, count(DISTINCT install_id) AS installs, round(avg(analytics_num(props, 'trophies')), 0) AS avg_trophies
FROM analytics_events WHERE name = 'ranked_event' GROUP BY 1 ORDER BY events DESC;

-- backups, restores and resets, and keyboard bindings
CREATE OR REPLACE VIEW analytics_v_data_actions AS
SELECT name, coalesce(props ->> 'action', '') AS action, coalesce(analytics_bool(props, 'ok'), true) AS ok, count(*) AS events, count(DISTINCT install_id) AS installs
FROM analytics_events WHERE name IN ('data_action', 'keybinding_changed') GROUP BY 1, 2, 3 ORDER BY 1, events DESC;

-- Language Dash Pro: the paywall funnel by what opened it (shown -> plan chosen -> purchase started -> bought), per experiment variant
CREATE OR REPLACE VIEW analytics_v_paywall AS
WITH v AS (SELECT coalesce(props ->> 'trigger', '') AS trigger, coalesce(props ->> 'variant', '') AS variant, count(*) AS views, count(DISTINCT install_id) AS viewers
           FROM analytics_events WHERE name = 'paywall_viewed' GROUP BY 1, 2),
a AS (SELECT coalesce(props ->> 'trigger', '') AS trigger,
             count(DISTINCT install_id) FILTER (WHERE props ->> 'action' = 'plan_selected') AS chose_plan,
             count(DISTINCT install_id) FILTER (WHERE props ->> 'action' = 'purchase_started') AS started,
             count(DISTINCT install_id) FILTER (WHERE props ->> 'action' = 'purchased') AS bought,
             count(DISTINCT install_id) FILTER (WHERE props ->> 'action' = 'cancelled') AS cancelled,
             count(DISTINCT install_id) FILTER (WHERE props ->> 'action' = 'failed') AS failed,
             count(DISTINCT install_id) FILTER (WHERE props ->> 'action' IN ('code_ok', 'restore_ok')) AS redeemed_or_restored
      FROM analytics_events WHERE name = 'paywall_action' GROUP BY 1)
SELECT v.trigger, v.variant, v.views, v.viewers, a.chose_plan, a.started, a.bought, analytics_pct(a.bought, v.viewers) AS buy_pct_of_viewers, a.cancelled, a.failed, a.redeemed_or_restored
FROM v LEFT JOIN a USING (trigger) ORDER BY v.views DESC;

-- Language Dash Pro: purchases by plan and currency, with the revenue before the store's cut (a trial that did not convert is not counted: the store tells you that)
CREATE OR REPLACE VIEW analytics_v_pro_revenue AS
SELECT date_trunc('week', ts)::date AS week, coalesce(props ->> 'plan', '') AS plan, coalesce(props ->> 'currency', '') AS currency,
       count(*) AS purchases, count(DISTINCT install_id) AS buyers,
       round(sum(analytics_num(props, 'micros')) / 1000000.0, 2) AS gross, coalesce(sum(analytics_num(props, 'trial_days')) FILTER (WHERE analytics_num(props, 'trial_days') > 0), 0) AS trial_days_offered
FROM analytics_events WHERE name = 'paywall_action' AND props ->> 'action' = 'purchased' GROUP BY 1, 2, 3 ORDER BY 1 DESC, 4 DESC;

-- Language Dash Pro: which limits free players hit, and how often
CREATE OR REPLACE VIEW analytics_v_pro_gates AS
SELECT props ->> 'feature' AS feature, props ->> 'mode' AS mode, count(*) AS hits, count(DISTINCT install_id) AS installs, round(avg(analytics_num(props, 'used')), 1) AS avg_used, max(analytics_num(props, 'limit')) AS gate_limit
FROM analytics_events WHERE name = 'pro_gate_hit' GROUP BY 1, 2 ORDER BY hits DESC;

-- Language Dash Pro: how many installs have it (latest status of each install), by source and plan
CREATE OR REPLACE VIEW analytics_v_pro_users AS
WITH latest AS (SELECT DISTINCT ON (install_id) install_id, props FROM analytics_events WHERE name = 'pro_status' ORDER BY install_id, ts DESC)
SELECT coalesce(analytics_bool(props, 'active'), false) AS active, coalesce(props ->> 'source', '') AS source, coalesce(props ->> 'plan', '') AS plan, coalesce(analytics_bool(props, 'trial'), false) AS trial, count(*) AS installs
FROM latest GROUP BY 1, 2, 3, 4 ORDER BY installs DESC;

-- ==================== 12. SETTINGS AND ACCESSIBILITY ====================

-- the latest value each install chose for each setting, and how many chose each
CREATE OR REPLACE VIEW analytics_v_settings AS
WITH latest AS (SELECT DISTINCT ON (install_id, props ->> 'key') install_id, props ->> 'key' AS key, props ->> 'value' AS value
                FROM analytics_events WHERE name = 'setting_changed' ORDER BY install_id, props ->> 'key', ts DESC)
SELECT key, coalesce(value, '') AS value, count(*) AS installs, analytics_pct(count(*), sum(count(*)) OVER (PARTITION BY key)) AS share_of_changers_pct
FROM latest GROUP BY key, value ORDER BY key, installs DESC;

CREATE OR REPLACE VIEW analytics_v_setting_changes AS
SELECT props ->> 'key' AS key, count(*) AS changes, count(DISTINCT install_id) AS installs, count(*) FILTER (WHERE ts > now() - interval '7 days') AS last_7_days
FROM analytics_events WHERE name = 'setting_changed' GROUP BY 1 ORDER BY changes DESC;

-- accessibility and comfort features in use, from runs
CREATE OR REPLACE VIEW analytics_v_accessibility AS
SELECT count(*) AS runs, count(DISTINCT install_id) AS installs,
       analytics_pct(count(*) FILTER (WHERE dyslexia), count(*)) AS dyslexia_font_pct, analytics_pct(count(*) FILTER (WHERE lefty), count(*)) AS left_hand_layout_pct,
       analytics_pct(count(*) FILTER (WHERE colorblind), count(*)) AS colorblind_pct, analytics_pct(count(*) FILTER (WHERE reduced_motion), count(*)) AS reduced_motion_pct,
       analytics_pct(count(*) FILTER (WHERE relaxed_pace), count(*)) AS relaxed_pace_pct, analytics_pct(count(*) FILTER (WHERE tts), count(*)) AS read_aloud_pct,
       analytics_pct(count(*) FILTER (WHERE night), count(*)) AS night_shift_pct, analytics_pct(count(*) FILTER (WHERE haptics), count(*)) AS vibration_pct,
       analytics_pct(count(*) FILTER (WHERE music), count(*)) AS music_on_pct, analytics_pct(count(*) FILTER (WHERE sfx), count(*)) AS sound_effects_on_pct
FROM analytics_v_run_starts;

-- ==================== 13. PERFORMANCE AND RELIABILITY ====================

-- frame rate by device kind and graphics level
CREATE OR REPLACE VIEW analytics_v_fps AS
SELECT coalesce(s.form, '') AS form, coalesce(s.os, '') AS os, coalesce(s.browser, '') AS browser, coalesce(r.tier_end, s.tier, '') AS tier, count(*) AS runs,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY r.fps_avg) AS median_fps, percentile_cont(0.1) WITHIN GROUP (ORDER BY r.fps_avg) AS p10_fps, round(avg(r.fps_p5)) AS avg_fps_p5,
       analytics_pct(count(*) FILTER (WHERE r.fps_avg < 30), count(*)) AS runs_under_30fps_pct
FROM analytics_v_runs r LEFT JOIN analytics_sessions s ON s.session_id = r.session_id WHERE r.fps_avg IS NOT NULL GROUP BY 1, 2, 3, 4 ORDER BY runs DESC;

-- how long the app takes to start
CREATE OR REPLACE VIEW analytics_v_load_times AS
SELECT e.ts::date AS day, coalesce(s.platform, '') AS platform, coalesce(analytics_bool(e.props, 'cached'), false) AS repeat_visit, coalesce(e.props ->> 'connection', 'unknown') AS connection, count(*) AS loads,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY analytics_num(e.props, 'boot_ms')) AS median_boot_ms, percentile_cont(0.9) WITHIN GROUP (ORDER BY analytics_num(e.props, 'boot_ms')) AS p90_boot_ms,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY analytics_num(e.props, 'cards_ready_ms')) AS median_cards_ready_ms, percentile_cont(0.5) WITHIN GROUP (ORDER BY analytics_num(e.props, 'first_paint_ms')) AS median_first_paint_ms,
       round(avg(analytics_num(e.props, 'transfer_kb'))) AS avg_transfer_kb
FROM analytics_events e LEFT JOIN analytics_sessions s ON s.session_id = e.session_id WHERE e.name = 'perf_load' GROUP BY 1, 2, 3, 4 ORDER BY 1 DESC;

CREATE OR REPLACE VIEW analytics_v_tier_changes AS
SELECT props ->> 'from' AS from_tier, props ->> 'to' AS to_tier, props ->> 'reason' AS reason, count(*) AS changes, count(DISTINCT install_id) AS installs
FROM analytics_events WHERE name = 'tier_changed' GROUP BY 1, 2, 3 ORDER BY changes DESC;

-- errors: what, where, how many people, which versions
CREATE OR REPLACE VIEW analytics_v_errors AS
SELECT coalesce(e.props ->> 'fingerprint', left(e.props ->> 'message', 40)) AS fingerprint, e.props ->> 'system' AS system, e.props ->> 'operation' AS operation, left(max(e.props ->> 'message'), 120) AS message,
       count(*) AS occurrences, count(DISTINCT e.install_id) AS installs, min(e.ts) AS first_seen, max(e.ts) AS last_seen, array_agg(DISTINCT s.version) FILTER (WHERE s.version IS NOT NULL) AS versions,
       count(*) FILTER (WHERE analytics_bool(e.props, 'in_run')) AS during_runs
FROM analytics_events e LEFT JOIN analytics_sessions s ON s.session_id = e.session_id WHERE e.name = 'error' GROUP BY 1, 2, 3 ORDER BY installs DESC, occurrences DESC;

-- how stable each version is: share of sessions with no error
CREATE OR REPLACE VIEW analytics_v_crash_free AS
SELECT coalesce(version, '') AS version, count(*) AS sessions, count(*) FILTER (WHERE coalesce(errors, 0) = 0) AS clean_sessions,
       analytics_pct(count(*) FILTER (WHERE coalesce(errors, 0) = 0), count(*)) AS crash_free_sessions_pct, count(DISTINCT install_id) AS installs
FROM analytics_v_session_summary GROUP BY 1 ORDER BY min(started_at) DESC;

CREATE OR REPLACE VIEW analytics_v_reliability_other AS
SELECT name, coalesce(props ->> 'chunk', props ->> 'reason', props ->> 'kind', '') AS detail, count(*) AS events, count(DISTINCT install_id) AS installs
FROM analytics_events WHERE name IN ('chunk_failed', 'webgl_unavailable', 'storage_problem') GROUP BY 1, 2 ORDER BY events DESC;

CREATE OR REPLACE VIEW analytics_v_offline AS
SELECT ts::date AS day, count(*) FILTER (WHERE NOT analytics_bool(props, 'online')) AS went_offline, count(*) FILTER (WHERE analytics_bool(props, 'online')) AS came_back,
       round(avg(analytics_num(props, 'seconds_offline')) FILTER (WHERE analytics_bool(props, 'online'))) AS avg_seconds_offline, count(DISTINCT install_id) AS installs
FROM analytics_events WHERE name = 'connection_changed' GROUP BY 1 ORDER BY 1 DESC;

CREATE OR REPLACE VIEW analytics_v_offline_pack AS
SELECT ts::date AS day, count(*) AS tries, count(*) FILTER (WHERE analytics_bool(props, 'ok')) AS ok, round(avg(analytics_num(props, 'mb')), 1) AS avg_mb, round(avg(analytics_num(props, 'ms'))) AS avg_ms
FROM analytics_events WHERE name = 'offline_pack' GROUP BY 1 ORDER BY 1 DESC;

-- which versions are out there, and how quickly updates reach people
CREATE OR REPLACE VIEW analytics_v_versions AS
SELECT day, coalesce(version, '') AS version, count(DISTINCT install_id) AS active_installs, count(*) AS sessions,
       analytics_pct(count(DISTINCT install_id), sum(count(DISTINCT install_id)) OVER (PARTITION BY day)) AS share_of_day_pct
FROM analytics_v_session_summary GROUP BY day, version ORDER BY day DESC, active_installs DESC;

CREATE OR REPLACE VIEW analytics_v_updates AS
SELECT ts::date AS day, count(*) FILTER (WHERE name = 'app_update_available') AS update_ready, count(*) FILTER (WHERE name = 'app_update_applied') AS update_applied,
       analytics_pct(count(*) FILTER (WHERE name = 'app_update_applied'), count(*) FILTER (WHERE name = 'app_update_available')) AS applied_pct
FROM analytics_events WHERE name IN ('app_update_available', 'app_update_applied') GROUP BY 1 ORDER BY 1 DESC;

-- ==================== 14. WHO PLAYS ON WHAT (DEVICES, LANGUAGE, REGION BY TIME ZONE) ====================

CREATE OR REPLACE VIEW analytics_v_devices AS
SELECT coalesce(form, '') AS form, coalesce(os, '') AS os, os_major, coalesce(browser, '') AS browser, count(DISTINCT install_id) AS installs, analytics_pct(count(DISTINCT install_id), (SELECT count(*) FROM analytics_installs)) AS share_pct
FROM analytics_sessions GROUP BY 1, 2, 3, 4 ORDER BY installs DESC;

CREATE OR REPLACE VIEW analytics_v_screens_and_hardware AS
SELECT coalesce(screen_w, 0) || 'x' || coalesce(screen_h, 0) AS screen, coalesce(dpr, 1) AS dpr, memory_gb, cores, count(DISTINCT install_id) AS installs
FROM analytics_sessions GROUP BY 1, 2, 3, 4 ORDER BY installs DESC;

CREATE OR REPLACE VIEW analytics_v_languages AS
SELECT coalesce(language, 'und') AS language, count(DISTINCT install_id) AS installs, analytics_pct(count(DISTINCT install_id), (SELECT count(*) FROM analytics_installs)) AS share_pct
FROM analytics_sessions GROUP BY 1 ORDER BY installs DESC;

-- time zone offset is a coarse stand-in for region (no IP geolocation is stored)
CREATE OR REPLACE VIEW analytics_v_time_zones AS
SELECT tz_offset AS utc_offset_hours, count(DISTINCT install_id) AS installs, analytics_pct(count(DISTINCT install_id), (SELECT count(*) FROM analytics_installs)) AS share_pct
FROM analytics_sessions WHERE tz_offset IS NOT NULL GROUP BY 1 ORDER BY installs DESC;

-- when people play: hour of day (UTC) and day of week
CREATE OR REPLACE VIEW analytics_v_play_times AS
SELECT extract(dow FROM ts)::int AS day_of_week, extract(hour FROM ts)::int AS hour_utc, count(*) AS runs, count(DISTINCT install_id) AS installs
FROM analytics_v_run_starts GROUP BY 1, 2 ORDER BY 1, 2;

CREATE OR REPLACE VIEW analytics_v_connection AS
SELECT coalesce(connection, 'unknown') AS connection, coalesce(standalone, false) AS installed_app, count(DISTINCT install_id) AS installs, count(*) AS sessions
FROM analytics_sessions GROUP BY 1, 2 ORDER BY installs DESC;

-- ==================== 15. EXPERIMENTS ====================

-- each experiment variant: who was in it and how they did
CREATE OR REPLACE VIEW analytics_v_experiments AS
WITH exposed AS (SELECT DISTINCT ON (install_id, props ->> 'experiment') install_id, props ->> 'experiment' AS experiment, props ->> 'variant' AS variant, ts AS exposed_at
                 FROM analytics_events WHERE name = 'experiment_exposed' ORDER BY install_id, props ->> 'experiment', ts)
SELECT x.experiment, x.variant, count(*) AS installs,
       analytics_pct(count(*) FILTER (WHERE EXISTS (SELECT 1 FROM analytics_v_active_days a WHERE a.install_id = x.install_id AND a.day - x.exposed_at::date = 1)), count(*) FILTER (WHERE x.exposed_at::date <= current_date - 1)) AS d1_pct,
       analytics_pct(count(*) FILTER (WHERE EXISTS (SELECT 1 FROM analytics_v_active_days a WHERE a.install_id = x.install_id AND a.day - x.exposed_at::date = 7)), count(*) FILTER (WHERE x.exposed_at::date <= current_date - 7)) AS d7_pct,
       round(avg((SELECT count(*) FROM analytics_v_run_starts r WHERE r.install_id = x.install_id AND r.ts >= x.exposed_at)), 2) AS runs_per_install,
       analytics_pct(count(*) FILTER (WHERE EXISTS (SELECT 1 FROM analytics_events e WHERE e.install_id = x.install_id AND e.name = 'purchase' AND e.ts >= x.exposed_at)), count(*)) AS purchased_pct
FROM exposed x GROUP BY x.experiment, x.variant ORDER BY x.experiment, x.variant;

-- ==================== 16. IS THE DATA ITSELF HEALTHY? ====================

-- every event: how many, how recent. An event that stops arriving is a bug in the app
CREATE OR REPLACE VIEW analytics_v_event_volume AS
SELECT name, count(*) AS total, count(*) FILTER (WHERE ts > now() - interval '1 day') AS last_24h, count(*) FILTER (WHERE ts > now() - interval '7 days') AS last_7d,
       count(DISTINCT install_id) AS installs, min(ts) AS first_seen, max(ts) AS last_seen, round(avg(sample_rate)::numeric, 2) AS avg_sample_rate
FROM analytics_events GROUP BY name ORDER BY total DESC;

-- the app's own report of dropped or failed sends
CREATE OR REPLACE VIEW analytics_v_data_health AS
SELECT ts::date AS day, count(*) AS reports, sum(analytics_num(props, 'dropped_invalid')) AS dropped_invalid, sum(analytics_num(props, 'dropped_full')) AS dropped_queue_full,
       sum(analytics_num(props, 'send_failures')) AS send_failures, round(avg(analytics_num(props, 'oldest_queued_min'))) AS avg_oldest_queued_min, count(DISTINCT install_id) AS installs
FROM analytics_events WHERE name = 'analytics_health' GROUP BY 1 ORDER BY 1 DESC;

CREATE OR REPLACE VIEW analytics_v_ingest_lag AS
SELECT received_at::date AS day, percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM received_at - ts)) AS median_lag_seconds,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY extract(epoch FROM received_at - ts)) AS p95_lag_seconds, count(*) AS events
FROM analytics_events GROUP BY 1 ORDER BY 1 DESC;

-- ==================== PERMISSIONS ====================
-- the views are for the project owner only

DO $$
DECLARE v record;
BEGIN
  FOR v IN SELECT viewname FROM pg_views WHERE schemaname = 'language_dash' AND viewname LIKE 'analytics\_v\_%' LOOP
    EXECUTE format('REVOKE ALL ON %I FROM PUBLIC, anon, authenticated', v.viewname);
  END LOOP;
END $$;

-- ===================================================================================================================
-- MEMBER GATE (generated: 36 tables). A RESTRICTIVE policy is ANDed with every other policy, so a signed-in
-- non-member sees and writes nothing, whatever the template's own policies say. service_role and the table owner bypass RLS.
-- ===================================================================================================================

DROP POLICY IF EXISTS ld_member_gate ON language_dash.player_profiles;
CREATE POLICY ld_member_gate ON language_dash.player_profiles AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.scores;
CREATE POLICY ld_member_gate ON language_dash.scores AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.friends;
CREATE POLICY ld_member_gate ON language_dash.friends AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.friend_blocks;
CREATE POLICY ld_member_gate ON language_dash.friend_blocks AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.match_invites;
CREATE POLICY ld_member_gate ON language_dash.match_invites AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.user_reports;
CREATE POLICY ld_member_gate ON language_dash.user_reports AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.card_reports;
CREATE POLICY ld_member_gate ON language_dash.card_reports AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.study_groups;
CREATE POLICY ld_member_gate ON language_dash.study_groups AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.group_members;
CREATE POLICY ld_member_gate ON language_dash.group_members AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.shared_decks;
CREATE POLICY ld_member_gate ON language_dash.shared_decks AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.activity_events;
CREATE POLICY ld_member_gate ON language_dash.activity_events AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.activity_kudos;
CREATE POLICY ld_member_gate ON language_dash.activity_kudos AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.weekly_study;
CREATE POLICY ld_member_gate ON language_dash.weekly_study AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.content_reports;
CREATE POLICY ld_member_gate ON language_dash.content_reports AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.app_feedback;
CREATE POLICY ld_member_gate ON language_dash.app_feedback AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.player_saves;
CREATE POLICY ld_member_gate ON language_dash.player_saves AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.player_saves_backup;
CREATE POLICY ld_member_gate ON language_dash.player_saves_backup AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.player_trophies;
CREATE POLICY ld_member_gate ON language_dash.player_trophies AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.ranked_queue;
CREATE POLICY ld_member_gate ON language_dash.ranked_queue AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.ranked_matches;
CREATE POLICY ld_member_gate ON language_dash.ranked_matches AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.ranked_reports;
CREATE POLICY ld_member_gate ON language_dash.ranked_reports AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.schools;
CREATE POLICY ld_member_gate ON language_dash.schools AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.cohorts;
CREATE POLICY ld_member_gate ON language_dash.cohorts AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.cohort_members;
CREATE POLICY ld_member_gate ON language_dash.cohort_members AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.cohort_war_points;
CREATE POLICY ld_member_gate ON language_dash.cohort_war_points AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.buddy_listings;
CREATE POLICY ld_member_gate ON language_dash.buddy_listings AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.group_join_requests;
CREATE POLICY ld_member_gate ON language_dash.group_join_requests AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.pro_entitlements;
CREATE POLICY ld_member_gate ON language_dash.pro_entitlements AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.pro_items;
CREATE POLICY ld_member_gate ON language_dash.pro_items AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.pro_redemptions;
CREATE POLICY ld_member_gate ON language_dash.pro_redemptions AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.pro_attempts;
CREATE POLICY ld_member_gate ON language_dash.pro_attempts AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.pro_library;
CREATE POLICY ld_member_gate ON language_dash.pro_library AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.pro_trials;
CREATE POLICY ld_member_gate ON language_dash.pro_trials AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.pro_stripe_customers;
CREATE POLICY ld_member_gate ON language_dash.pro_stripe_customers AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.apple_tokens;
CREATE POLICY ld_member_gate ON language_dash.apple_tokens AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));
DROP POLICY IF EXISTS ld_member_gate ON language_dash.pro_store_purchases;
CREATE POLICY ld_member_gate ON language_dash.pro_store_purchases AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));

-- ===================================================================================================================
-- MEMBER DATA WIPE (generated from the table classification: 35 tables, children before parents)
-- ===================================================================================================================

-- Removes every Language Dash row that belongs to p_user, then the membership. NEVER touches auth.users (the shared sign-in).
-- Used by delete_my_ld_data() for the caller, and by the edge function (service role) just before it removes the sign-in.
CREATE OR REPLACE FUNCTION language_dash.purge_user_data(p_user uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE n integer; counts jsonb := '{}'::jsonb;
BEGIN
  IF p_user IS NULL THEN RAISE EXCEPTION 'user required'; END IF;
  DELETE FROM language_dash.activity_kudos WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('activity_kudos', n);
  DELETE FROM language_dash.activity_events WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('activity_events', n);
  DELETE FROM language_dash.app_feedback WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('app_feedback', n);
  DELETE FROM language_dash.apple_tokens WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('apple_tokens', n);
  DELETE FROM language_dash.buddy_listings WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('buddy_listings', n);
  DELETE FROM language_dash.card_reports WHERE reporter_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('card_reports', n);
  DELETE FROM language_dash.cohort_members WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('cohort_members', n);
  DELETE FROM language_dash.cohort_war_points WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('cohort_war_points', n);
  DELETE FROM language_dash.content_reports WHERE reporter_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('content_reports', n);
  DELETE FROM language_dash.friend_blocks WHERE blocker_id = p_user OR blocked_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('friend_blocks', n);
  DELETE FROM language_dash.friends WHERE requester_id = p_user OR addressee_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('friends', n);
  DELETE FROM language_dash.group_join_requests WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('group_join_requests', n);
  DELETE FROM language_dash.group_members WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('group_members', n);
  DELETE FROM language_dash.match_invites WHERE from_user = p_user OR to_user = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('match_invites', n);
  DELETE FROM language_dash.player_profiles WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('player_profiles', n);
  DELETE FROM language_dash.player_saves WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('player_saves', n);
  DELETE FROM language_dash.player_saves_backup WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('player_saves_backup', n);
  DELETE FROM language_dash.player_trophies WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('player_trophies', n);
  DELETE FROM language_dash.pro_attempts WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('pro_attempts', n);
  DELETE FROM language_dash.pro_entitlements WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('pro_entitlements', n);
  DELETE FROM language_dash.pro_items WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('pro_items', n);
  DELETE FROM language_dash.pro_library WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('pro_library', n);
  DELETE FROM language_dash.pro_redemptions WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('pro_redemptions', n);
  DELETE FROM language_dash.pro_store_purchases WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('pro_store_purchases', n);
  DELETE FROM language_dash.pro_stripe_customers WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('pro_stripe_customers', n);
  DELETE FROM language_dash.pro_trials WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('pro_trials', n);
  DELETE FROM language_dash.ranked_reports WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('ranked_reports', n);
  DELETE FROM language_dash.ranked_matches WHERE host_id = p_user OR guest_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('ranked_matches', n);
  DELETE FROM language_dash.ranked_queue WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('ranked_queue', n);
  UPDATE language_dash.schools SET created_by = NULL WHERE created_by = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('schools.created_by', n);
  DELETE FROM language_dash.scores WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('scores', n);
  DELETE FROM language_dash.shared_decks WHERE owner_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('shared_decks', n);
  DELETE FROM language_dash.study_groups WHERE owner_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('study_groups', n);
  DELETE FROM language_dash.user_reports WHERE reporter_id = p_user OR reported_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('user_reports', n);
  DELETE FROM language_dash.weekly_study WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('weekly_study', n);
  DELETE FROM language_dash.members WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('members', n);
  RETURN counts;
END $$;

-- "Delete my Language Dash account": the caller's Language Dash data and membership only. Works for a non-member too (it
-- clears anything a payment webhook may have recorded before they joined). A subscription that is still billing must be
-- cancelled first, exactly as the template's delete_my_account required.
CREATE OR REPLACE FUNCTION language_dash.delete_my_ld_data() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = language_dash, pg_temp AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_signed_in' USING ERRCODE = '28000'; END IF;
  IF EXISTS (SELECT 1 FROM language_dash.pro_entitlements WHERE user_id = me AND source = 'stripe' AND plan IN ('monthly', 'yearly', 'pass3m') AND until > now()) THEN
    RAISE EXCEPTION 'subscription_still_billing' USING ERRCODE = '55000',
      HINT = 'Cancel the subscription first (Settings, Language Dash Pro, Manage subscription), then delete your Language Dash data.';
  END IF;
  RETURN language_dash.purge_user_data(me);
END $$;

REVOKE ALL ON FUNCTION language_dash.purge_user_data(uuid), language_dash.delete_my_ld_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION language_dash.delete_my_ld_data() TO authenticated;

-- ===================================================================================================================
-- from database/lockdown.sql (allow-lists patched: delete_my_account -> delete_my_ld_data, is_member, join_language_dash,
-- my_membership; members added to the table grants)
-- ===================================================================================================================

-- ================================================================
-- Lockdown: who may call what, and who may touch which table. RUN THIS LAST, after every other file. Safe to run again.
--
-- Why it exists: Supabase hands every new function and table to the signed-in (authenticated) and signed-out (anon)
-- roles by default, and "REVOKE ... FROM PUBLIC" does not take that away. Left like that, anyone with the public app
-- key could call functions meant only for the payment server, for example the one that grants Pro. So this file closes
-- EVERYTHING first, then opens only the short lists below: the functions the app calls and the tables it reads.
-- A function or table that is not on a list stays closed. The Edge Functions use the service role, which is untouched.
--
-- tests/unit/dbprivileges.test.js runs this against a database that has Supabase's default grants, and fails if anything
-- else is open. Adding a function the app should call means adding its name to the list below (and to that test).
-- ================================================================

-- Anything created from now on starts closed.
ALTER DEFAULT PRIVILEGES IN SCHEMA language_dash REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

DO $lock$
DECLARE
  r record;
  fn text;
  -- the functions the signed-in app calls (and the helpers its row-security rules use)
  signed_in text[] := ARRAY[
    'cancel_group_request', 'can_see_activity', 'can_see_post', 'cohort_create', 'cohort_join', 'cohort_kick', 'cohort_leave',
    'cohort_search', 'cohort_set_role', 'cohort_war_standings', 'create_group', 'delete_my_ld_data', 'is_member', 'join_language_dash', 'my_membership', 'discover_groups',
    'find_buddies', 'force_save', 'get_feed', 'get_my_pro', 'get_shared_deck', 'give_kudos', 'group_goal_status',
    'group_leaderboard', 'group_requests', 'has_block_between', 'is_group_member', 'join_group', 'join_public_group',
    'leave_group', 'my_buddy_listing', 'my_cohort', 'my_groups', 'my_recent_kudos', 'publish_deck', 'push_save',
    'ranked_cancel', 'ranked_find_match', 'ranked_my_stats', 'ranked_poll_match', 'ranked_report', 'ranked_settle_stale',
    'ranked_top', 'redeem_pro_code', 'remove_buddy_listing', 'remove_kudos', 'report_content', 'report_diagnostic',
    'report_study', 'resolve_group_request', 'restore_backup_save', 'school_standings', 'season_standing',
    'set_activity_visibility', 'set_buddy_listing', 'set_group_discovery', 'set_group_goal', 'start_my_trial',
    'submit_feedback', 'upsert_player_profile'
  ];
  -- the three that work with no sign-in at all (anonymous, consent-based usage statistics)
  open_to_all text[] := ARRAY['ingest_analytics', 'delete_analytics', 'count_consent'];
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig, p.proname AS name
           FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'language_dash' AND p.prokind IN ('f', 'p') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    IF r.name = ANY (signed_in) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    ELSIF r.name = ANY (open_to_all) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', r.sig);
    END IF;
  END LOOP;
END
$lock$;

-- ---------- tables and views ----------
-- Nobody signed out may write anything, and nobody may truncate or re-shape a table. What the signed-in app reads and
-- writes directly is listed; every row is still limited by the row-security rules in policies.sql.
DO $lock$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT c.oid::regclass AS rel, c.relname AS name
           FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'language_dash' AND c.relkind IN ('r', 'v', 'm', 'p') LOOP
    EXECUTE format('REVOKE ALL ON %s FROM PUBLIC, anon, authenticated', r.rel);
  END LOOP;
END
$lock$;

DO $lock$
DECLARE
  g record;
BEGIN
  FOR g IN SELECT * FROM (VALUES
    -- table,             anon,    signed in
    ('members',           '',       'SELECT'),                                 -- (language_dash.members: a signed-in user reads only their own row; rows are created only by join_language_dash)
    ('activity_events',   '',       'SELECT, INSERT, DELETE'),
    ('card_reports',      '',       'SELECT, INSERT'),
    ('friend_blocks',     '',       'SELECT, INSERT, DELETE'),
    ('friends',           '',       'SELECT, INSERT, UPDATE (status), DELETE'),   -- (only the status: never who the two people are)
    ('group_members',     '',       'SELECT'),
    ('leaderboard_alltime', 'SELECT', 'SELECT'),
    ('leaderboard_best',  'SELECT', 'SELECT'),
    ('match_invites',     '',       'SELECT, INSERT, UPDATE (status)'),
    ('player_profiles',   'SELECT', 'SELECT'),                       -- (written only through upsert_player_profile, which keeps bests from going down)
    ('player_saves',      '',       'SELECT'),                      -- (never deleted from the app: only by deleting the whole account)
    ('scores',            'SELECT', 'SELECT, INSERT'),
    ('shared_decks',      '',       'SELECT, DELETE'),
    ('study_groups',      '',       'SELECT'),
    ('user_reports',      '',       'SELECT, INSERT')
  ) AS t(tbl, anon_priv, user_priv) LOOP
    IF to_regclass('language_dash.' || g.tbl) IS NOT NULL THEN
      IF g.anon_priv <> '' THEN EXECUTE format('GRANT %s ON language_dash.%I TO anon', g.anon_priv, g.tbl); END IF;
      EXECUTE format('GRANT %s ON language_dash.%I TO authenticated', g.user_priv, g.tbl);
    END IF;
  END LOOP;
END
$lock$;

-- ===================================================================================================================
-- ROLE ACCESS TO THE SCHEMA (after lockdown.sql, which closed everything and opened only the allow-lists)
-- service_role bypasses row security but still needs privileges; anon and authenticated get schema USAGE only
-- (the allow-lists above decide what they may touch inside it).
-- ===================================================================================================================

GRANT USAGE ON SCHEMA language_dash TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA language_dash TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA language_dash TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA language_dash TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA language_dash GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA language_dash GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA language_dash GRANT EXECUTE ON FUNCTIONS TO service_role;

COMMIT;
