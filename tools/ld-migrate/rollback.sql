-- ===================================================================================================================
-- ROLLBACK of the Language Dash migration:  DROP SCHEMA language_dash CASCADE.
--
-- WHAT IT DELETES: every Language Dash table, view, function, policy and ROW: all Language Dash players' profiles, scores,
-- friends, cloud saves, Pro entitlements, analytics... and the membership list. There is no undo (restore from a backup).
-- WHAT IT NEVER TOUCHES: the "public" schema (Dx Dash and any other app), the shared sign-in table auth.users, and every
-- other schema. The Language Dash objects in the supabase_realtime publication go away with their tables.
--
-- TO RUN IT: change NO to YES on the line marked <<<, then run the whole file (psql or the SQL editor). As shipped it
-- only prints the warning and refuses. Everything happens in ONE statement, so there is no half-run.
-- ===================================================================================================================
DO $rollback$
DECLARE
  confirm text := 'NO';  -- <<< change 'NO' to 'YES' to allow the drop
  members bigint := 0;
  tables bigint := 0;
BEGIN
  IF to_regclass('language_dash.members') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM language_dash.members' INTO members;
  END IF;
  SELECT count(*) INTO tables FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'language_dash' AND c.relkind IN ('r', 'p');
  RAISE WARNING 'ROLLBACK: this drops schema language_dash with % tables and % Language Dash members, and all their data. It does not touch public or auth.', tables, members;
  IF confirm <> 'YES' THEN
    RAISE EXCEPTION 'rollback refused: set confirm to YES in this script to drop language_dash';
  END IF;
  EXECUTE 'DROP SCHEMA IF EXISTS language_dash CASCADE';
  RAISE WARNING 'language_dash dropped. public and auth were not touched.';
END
$rollback$;
