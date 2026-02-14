-- ============================================================
-- Migration 025: Backfill element_events from existing timestamps
-- ============================================================
-- Elements that already have timestamp columns set but no
-- corresponding element_events rows get synthetic events
-- so the timeline and reporting charts show historical data.
-- ============================================================

-- Insert "planned" event for all elements that exist
INSERT INTO element_events (element_id, previous_status, status, notes, created_by, created_at)
SELECT
  e.id,
  NULL,
  'planned',
  'Sjálfvirk skráning',
  e.created_by,
  e.created_at
FROM elements e
WHERE NOT EXISTS (
  SELECT 1 FROM element_events ev
  WHERE ev.element_id = e.id AND ev.status = 'planned'
);

-- Insert "rebar" event where rebar_completed_at is set
INSERT INTO element_events (element_id, previous_status, status, notes, created_by, created_at)
SELECT
  e.id,
  'planned',
  'rebar',
  'Sjálfvirk skráning',
  e.created_by,
  e.rebar_completed_at
FROM elements e
WHERE e.rebar_completed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM element_events ev
    WHERE ev.element_id = e.id AND ev.status = 'rebar'
  );

-- Insert "cast" event where cast_at is set
INSERT INTO element_events (element_id, previous_status, status, notes, created_by, created_at)
SELECT
  e.id,
  'rebar',
  'cast',
  'Sjálfvirk skráning',
  e.created_by,
  e.cast_at
FROM elements e
WHERE e.cast_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM element_events ev
    WHERE ev.element_id = e.id AND ev.status = 'cast'
  );

-- Insert "curing" event where curing_completed_at is set
INSERT INTO element_events (element_id, previous_status, status, notes, created_by, created_at)
SELECT
  e.id,
  'cast',
  'curing',
  'Sjálfvirk skráning',
  e.created_by,
  e.curing_completed_at
FROM elements e
WHERE e.curing_completed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM element_events ev
    WHERE ev.element_id = e.id AND ev.status = 'curing'
  );

-- Insert "ready" event where ready_at is set
INSERT INTO element_events (element_id, previous_status, status, notes, created_by, created_at)
SELECT
  e.id,
  'curing',
  'ready',
  'Sjálfvirk skráning',
  e.created_by,
  e.ready_at
FROM elements e
WHERE e.ready_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM element_events ev
    WHERE ev.element_id = e.id AND ev.status = 'ready'
  );

-- Insert "loaded" event where loaded_at is set
INSERT INTO element_events (element_id, previous_status, status, notes, created_by, created_at)
SELECT
  e.id,
  'ready',
  'loaded',
  'Sjálfvirk skráning',
  e.created_by,
  e.loaded_at
FROM elements e
WHERE e.loaded_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM element_events ev
    WHERE ev.element_id = e.id AND ev.status = 'loaded'
  );

-- Insert "delivered" event where delivered_at is set
INSERT INTO element_events (element_id, previous_status, status, notes, created_by, created_at)
SELECT
  e.id,
  'loaded',
  'delivered',
  'Sjálfvirk skráning',
  e.created_by,
  e.delivered_at
FROM elements e
WHERE e.delivered_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM element_events ev
    WHERE ev.element_id = e.id AND ev.status = 'delivered'
  );
