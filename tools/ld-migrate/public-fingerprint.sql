-- Fingerprint of everything in the "public" schema (relations, columns, functions, policies, triggers, grants). Run it
-- BEFORE and AFTER the Language Dash migration: the two outputs must be identical. Read-only.
SELECT count(*) AS objects, md5(string_agg(x, E'\n' ORDER BY x)) AS public_fingerprint FROM (
  SELECT 'rel ' || c.relname || ' ' || c.relkind::text || ' ' || coalesce(c.relacl::text, '') || ' ' || c.relrowsecurity::text AS x
    FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace
  UNION ALL SELECT 'col ' || c.relname || '.' || a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
    FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid WHERE c.relnamespace = 'public'::regnamespace AND a.attnum > 0 AND NOT a.attisdropped
  UNION ALL SELECT 'fn ' || p.oid::regprocedure::text || ' ' || md5(p.prosrc) || ' ' || coalesce(p.proacl::text, '') || ' ' || coalesce(p.proconfig::text, '')
    FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
  UNION ALL SELECT 'policy ' || tablename || '.' || policyname || ' ' || permissive || ' ' || coalesce(qual, '') || ' ' || coalesce(with_check, '')
    FROM pg_policies WHERE schemaname = 'public'
  UNION ALL SELECT 'trigger ' || c.relname || '.' || t.tgname
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE c.relnamespace = 'public'::regnamespace AND NOT t.tgisinternal
  UNION ALL SELECT 'constraint ' || c.relname || '.' || k.conname || ' ' || pg_get_constraintdef(k.oid)
    FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid WHERE c.relnamespace = 'public'::regnamespace
  UNION ALL SELECT 'defacl ' || d.defaclrole::regrole::text || ' ' || d.defaclobjtype::text || ' ' || coalesce(d.defaclacl::text, '')
    FROM pg_default_acl d WHERE d.defaclnamespace = 'public'::regnamespace
  UNION ALL SELECT 'schema-acl ' || coalesce(nspacl::text, '') FROM pg_namespace WHERE nspname = 'public'
) s;
