-- Migration 048: Document replacement versioning + Element piece count
-- Addresses factory owner feedback:
--   1) Replacing a drawing loses the element link (no versioning)
--   3) Batch view can't show element quantities (no piece_count)

-- ─── 1. Document replacement versioning ──────────────────────────
-- Mirrors the floor_plans.previous_version_id pattern.
-- When a drawing is replaced, the new document links back to the old one
-- while inheriting element_id, building_id, floor, and category.

ALTER TABLE project_documents
  ADD COLUMN IF NOT EXISTS replaces_document_id uuid
  REFERENCES project_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_documents_replaces
  ON project_documents(replaces_document_id);

-- ─── 2. Element piece count ──────────────────────────────────────
-- Allows a single element record to represent multiple physical pieces.
-- E.g., "SG-1" with piece_count=3 means 3 identical svalagangur pieces.
-- Default 1 preserves backward compatibility.

ALTER TABLE elements
  ADD COLUMN IF NOT EXISTS piece_count integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN elements.piece_count IS
  'Number of physical pieces this element record represents (default 1)';
