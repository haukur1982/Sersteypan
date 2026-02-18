-- Temporary diagnostic function to inspect triggers on the elements table
-- Will be dropped after use

CREATE OR REPLACE FUNCTION _temp_inspect_element_triggers()
RETURNS TABLE(
  trigger_name text,
  event_manipulation text,
  action_timing text,
  action_statement text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    t.trigger_name::text,
    t.event_manipulation::text,
    t.action_timing::text,
    t.action_statement::text
  FROM information_schema.triggers t
  WHERE t.event_object_table = 'elements'
    AND t.event_object_schema = 'public'
  ORDER BY t.action_timing, t.trigger_name;
$$;

-- Also: get the actual function source for any trigger function
CREATE OR REPLACE FUNCTION _temp_get_function_source(fn_name text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_get_functiondef(p.oid)
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = fn_name
  LIMIT 1;
$$;
