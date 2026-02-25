-- Migration 054: Shift Schedule System (Vaktaplan)
-- Pattern-based rotating shift schedule for factory workers.
-- 4 groups (A, B, C, D) rotate on a cycle where 2 groups work each day.
-- Only exceptions (overrides) are stored individually.

-- =============================================================================
-- Table: shift_groups — Named groups (A, B, C, D)
-- =============================================================================
CREATE TABLE IF NOT EXISTS shift_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT 'blue',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- Table: shift_group_members — Workers in each group
-- =============================================================================
CREATE TABLE IF NOT EXISTS shift_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES shift_groups(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- Table: shift_patterns — Rotation cycle definition
-- =============================================================================
CREATE TABLE IF NOT EXISTS shift_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Aðalvaktaplan',
  start_date date NOT NULL,
  cycle_days integer NOT NULL,
  pattern jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- pattern is an array of arrays, e.g.:
-- [["A","B"], ["C","D"], ["A-","C"], ["B","D"], ...]
-- "-" suffix = half day for that group
-- cycle repeats every cycle_days days
-- Today's groups = pattern[(today - start_date) % cycle_days]

-- =============================================================================
-- Table: shift_overrides — Individual deviations from the pattern
-- =============================================================================
CREATE TABLE IF NOT EXISTS shift_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES shift_group_members(id) ON DELETE CASCADE,
  override_date date NOT NULL,
  override_type text NOT NULL CHECK (override_type IN ('extra_full', 'extra_half', 'absent', 'half_day')),
  reason text,
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, override_date)
);

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_shift_group_members_group ON shift_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_shift_group_members_profile ON shift_group_members(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shift_overrides_date ON shift_overrides(override_date);
CREATE INDEX IF NOT EXISTS idx_shift_overrides_member ON shift_overrides(member_id);
CREATE INDEX IF NOT EXISTS idx_shift_patterns_active ON shift_patterns(is_active) WHERE is_active = true;

-- =============================================================================
-- RLS Policies
-- =============================================================================
ALTER TABLE shift_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_overrides ENABLE ROW LEVEL SECURITY;

-- shift_groups: admin + factory_manager full access
CREATE POLICY "shift_groups_select" ON shift_groups FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'factory_manager'));
CREATE POLICY "shift_groups_insert" ON shift_groups FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'factory_manager'));
CREATE POLICY "shift_groups_update" ON shift_groups FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'factory_manager'));
CREATE POLICY "shift_groups_delete" ON shift_groups FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'factory_manager'));

-- shift_group_members: admin + factory_manager full access
CREATE POLICY "shift_group_members_select" ON shift_group_members FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'factory_manager'));
CREATE POLICY "shift_group_members_insert" ON shift_group_members FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'factory_manager'));
CREATE POLICY "shift_group_members_update" ON shift_group_members FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'factory_manager'));
CREATE POLICY "shift_group_members_delete" ON shift_group_members FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'factory_manager'));

-- shift_patterns: admin + factory_manager full access
CREATE POLICY "shift_patterns_select" ON shift_patterns FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'factory_manager'));
CREATE POLICY "shift_patterns_insert" ON shift_patterns FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'factory_manager'));
CREATE POLICY "shift_patterns_update" ON shift_patterns FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'factory_manager'));
CREATE POLICY "shift_patterns_delete" ON shift_patterns FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'factory_manager'));

-- shift_overrides: admin + factory_manager full access
CREATE POLICY "shift_overrides_select" ON shift_overrides FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'factory_manager'));
CREATE POLICY "shift_overrides_insert" ON shift_overrides FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'factory_manager'));
CREATE POLICY "shift_overrides_update" ON shift_overrides FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'factory_manager'));
CREATE POLICY "shift_overrides_delete" ON shift_overrides FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'factory_manager'));

-- =============================================================================
-- Seed function: pre-populate groups from known Excel data
-- =============================================================================
CREATE OR REPLACE FUNCTION seed_shift_groups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_a uuid;
  v_group_b uuid;
  v_group_c uuid;
  v_group_d uuid;
BEGIN
  -- Only seed if no groups exist
  IF EXISTS (SELECT 1 FROM shift_groups LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO shift_groups (name, color, sort_order) VALUES ('A', 'blue', 1) RETURNING id INTO v_group_a;
  INSERT INTO shift_groups (name, color, sort_order) VALUES ('B', 'green', 2) RETURNING id INTO v_group_b;
  INSERT INTO shift_groups (name, color, sort_order) VALUES ('C', 'amber', 3) RETURNING id INTO v_group_c;
  INSERT INTO shift_groups (name, color, sort_order) VALUES ('D', 'purple', 4) RETURNING id INTO v_group_d;

  -- Group A members
  INSERT INTO shift_group_members (group_id, display_name) VALUES (v_group_a, 'Jarik');
  INSERT INTO shift_group_members (group_id, display_name) VALUES (v_group_a, 'Pawel M');

  -- Group B members
  INSERT INTO shift_group_members (group_id, display_name) VALUES (v_group_b, 'Kasper');
  INSERT INTO shift_group_members (group_id, display_name) VALUES (v_group_b, 'Pawel H');

  -- Group C members
  INSERT INTO shift_group_members (group_id, display_name) VALUES (v_group_c, 'Tomas');
  INSERT INTO shift_group_members (group_id, display_name) VALUES (v_group_c, 'Jacek M');
  INSERT INTO shift_group_members (group_id, display_name) VALUES (v_group_c, 'Kamil M');
  INSERT INTO shift_group_members (group_id, display_name) VALUES (v_group_c, 'Cesary');

  -- Group D members
  INSERT INTO shift_group_members (group_id, display_name) VALUES (v_group_d, 'Dawid Pitch');
  INSERT INTO shift_group_members (group_id, display_name) VALUES (v_group_d, 'Florian');
  INSERT INTO shift_group_members (group_id, display_name) VALUES (v_group_d, 'Pawel Koson');
  INSERT INTO shift_group_members (group_id, display_name) VALUES (v_group_d, 'Kristof');
END;
$$;

-- Run the seed
SELECT seed_shift_groups();
