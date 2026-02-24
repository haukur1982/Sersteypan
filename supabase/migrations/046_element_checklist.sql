-- ============================================================
-- Migration 046: Per-Element Production Checklist
-- ============================================================
-- Adds a JSONB checklist column to elements table, matching
-- the same 7-item production checklist used on production_batches.
-- This allows tracking QC readiness per individual element.
-- ============================================================

-- Add checklist column
ALTER TABLE elements
  ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb;

-- Set the column default to the 7-item production checklist
ALTER TABLE elements
  ALTER COLUMN checklist SET DEFAULT '[
    {"key": "dimensions", "label": "Mál staðfest", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "mold_oiled", "label": "Mót olíuborið", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "rebar", "label": "Járnabinding staðfest", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "plumbing", "label": "Raflagnir/pípulagnir staðsettar", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "photos", "label": "Myndir hlaðnar upp", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "concrete_cover", "label": "Steypuhula yfir stáli", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "concrete_truck", "label": "Steypubíll C35 / ½ flot 70-75 á mæli", "checked": false, "checked_by": null, "checked_at": null}
  ]'::jsonb;

-- Backfill existing elements that have an empty checklist
-- Only fill elements that haven't been delivered yet (still in production)
UPDATE elements
SET checklist = '[
    {"key": "dimensions", "label": "Mál staðfest", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "mold_oiled", "label": "Mót olíuborið", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "rebar", "label": "Járnabinding staðfest", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "plumbing", "label": "Raflagnir/pípulagnir staðsettar", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "photos", "label": "Myndir hlaðnar upp", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "concrete_cover", "label": "Steypuhula yfir stáli", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "concrete_truck", "label": "Steypubíll C35 / ½ flot 70-75 á mæli", "checked": false, "checked_by": null, "checked_at": null}
  ]'::jsonb
WHERE checklist = '[]'::jsonb OR checklist IS NULL;
