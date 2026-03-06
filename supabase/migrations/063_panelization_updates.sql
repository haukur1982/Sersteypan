-- 063: Panelization constraint updates + surface analysis mode
--
-- 1. Update panelization_layouts defaults to match owner's factory limits
-- 2. Add analysis_mode column to drawing_analyses for surface vs element analysis

-- ── Update panelization defaults ────────────────────────────────

ALTER TABLE panelization_layouts
  ALTER COLUMN max_panel_width_mm SET DEFAULT 2500,
  ALTER COLUMN max_panel_weight_kg SET DEFAULT 20000;

-- ── Add analysis_mode to drawing_analyses ───────────────────────

ALTER TABLE drawing_analyses
  ADD COLUMN IF NOT EXISTS analysis_mode text NOT NULL DEFAULT 'elements';

-- Add check constraint (elements = production drawings, surfaces = architectural floor plans)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'drawing_analyses_analysis_mode_check'
  ) THEN
    ALTER TABLE drawing_analyses
      ADD CONSTRAINT drawing_analyses_analysis_mode_check
      CHECK (analysis_mode IN ('elements', 'surfaces'));
  END IF;
END $$;
