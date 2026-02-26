-- Migration 056: Fix batch function overload ambiguity
--
-- Migration 053 added a new parameter (p_element_quantities) to both
-- create_rebar_batch_with_elements and create_batch_with_elements.
-- However, CREATE OR REPLACE FUNCTION with a different parameter count
-- creates a NEW overload instead of replacing the old one.
-- Since all trailing params have DEFAULT NULL, PostgreSQL cannot
-- disambiguate when the new params are omitted — causing:
--   "Could not choose the best candidate function between..."
--
-- Fix: Drop the old overloads, keeping only the latest versions from migration 053.

-- 1. Drop old 4-param rebar batch overload (from migration 041/045)
--    Keeps: 5-param version from migration 053
DROP FUNCTION IF EXISTS create_rebar_batch_with_elements(uuid, uuid[], uuid, text);

-- 2. Drop old 6-param casting batch overload (from migration 029)
--    Keeps: 8-param version from migration 053
DROP FUNCTION IF EXISTS create_batch_with_elements(uuid, uuid[], uuid, text, text, text);

-- 3. Drop old 7-param casting batch overload (from migration 035)
--    Keeps: 8-param version from migration 053
DROP FUNCTION IF EXISTS create_batch_with_elements(uuid, uuid[], uuid, text, text, text, numeric);
