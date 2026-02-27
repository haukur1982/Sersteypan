-- Migration 060: Natural sort for element names
--
-- Problem: Element names like SG-1, SG-10, SG-2 are sorted lexicographically
--          instead of naturally (SG-1, SG-2, ..., SG-10).
--
-- Solution: A generated column `name_sort_key` that zero-pads all numbers
--           in the name string, making lexicographic order == natural order.
--
-- Example: "SG-1"    → "SG-00000000000000000001"
--          "SG-10"   → "SG-00000000000000000010"
--          "F(A)-3-2"→ "F(A)-00000000000000000003-00000000000000000002"

-- 1. Helper function: splits text on digit/non-digit boundaries,
--    zero-pads numeric parts to 20 digits.
CREATE OR REPLACE FUNCTION natural_sort_key(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE STRICT PARALLEL SAFE
AS $$
  SELECT string_agg(
    CASE
      WHEN part ~ '^\d+$' THEN lpad(part, 20, '0')
      ELSE part
    END,
    ''
  )
  FROM unnest(
    regexp_split_to_array(input, '(?<=\D)(?=\d)|(?<=\d)(?=\D)')
  ) AS parts(part)
$$;

-- 2. Add generated column on elements table.
--    Auto-computed on INSERT/UPDATE of `name`. Read-only.
ALTER TABLE elements
  ADD COLUMN name_sort_key text
  GENERATED ALWAYS AS (natural_sort_key(name)) STORED;

-- 3. Index for fast ORDER BY name_sort_key queries.
CREATE INDEX idx_elements_name_sort_key ON elements (name_sort_key);
