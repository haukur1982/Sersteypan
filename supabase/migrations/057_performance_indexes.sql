-- ═══════════════════════════════════════════════════════════════
-- Migration 057: Performance indexes for high-traffic queries
-- ═══════════════════════════════════════════════════════════════
-- These indexes target the most frequent query patterns that are
-- currently doing sequential scans on large tables.

-- ─── Elements: most-queried table ───────────────────────────
-- Standalone project_id index (composite idx_elements_project_status
-- doesn't help when filtering by project_id alone or with other cols)
CREATE INDEX IF NOT EXISTS idx_elements_project_id
  ON elements(project_id);

-- cast_at: framvinda period auto-suggest filters by date range
CREATE INDEX IF NOT EXISTS idx_elements_cast_at
  ON elements(cast_at DESC) WHERE cast_at IS NOT NULL;

-- ready_at: stigar (staircase) period auto-suggest uses this
CREATE INDEX IF NOT EXISTS idx_elements_ready_at
  ON elements(ready_at DESC) WHERE ready_at IS NOT NULL;

-- delivered_at: delivery tracking and period calculations
CREATE INDEX IF NOT EXISTS idx_elements_delivered_at
  ON elements(delivered_at DESC) WHERE delivered_at IS NOT NULL;

-- drawing_reference: framvinda groupByDrawingReference() for svalir/svalagangar
CREATE INDEX IF NOT EXISTS idx_elements_drawing_reference
  ON elements(drawing_reference) WHERE drawing_reference IS NOT NULL;

-- element_type: factory queries frequently filter by type
CREATE INDEX IF NOT EXISTS idx_elements_element_type
  ON elements(element_type);

-- updated_at: stuck elements query orders by this
CREATE INDEX IF NOT EXISTS idx_elements_updated_at
  ON elements(updated_at DESC);

-- ─── Element events: stuck element lookup ───────────────────
-- element_id + created_at: getStuckElements fetches latest event per element
CREATE INDEX IF NOT EXISTS idx_element_events_element_created
  ON element_events(element_id, created_at DESC);

-- ─── Project messages: unread count query ───────────────────
-- Partial index on is_read=false (only rows that matter for unread counts)
CREATE INDEX IF NOT EXISTS idx_project_messages_unread
  ON project_messages(is_read) WHERE is_read = false;

-- ─── Deliveries: completed_at for framvinda ─────────────────
CREATE INDEX IF NOT EXISTS idx_deliveries_completed_at
  ON deliveries(completed_at DESC) WHERE completed_at IS NOT NULL;
