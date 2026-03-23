-- Element Building Positions
-- Stores AI-extracted physical positions for precast elements in their building
-- These represent where the element goes in the real building (mm coordinates)
-- Separate from element_positions table which stores visual pins on floor plan images
--
-- Created: 2026-03-22

-- Add position columns to elements table (all nullable — existing elements unaffected)
alter table elements
  add column if not exists position_x_mm integer,
  add column if not exists position_y_mm integer,
  add column if not exists rotation_deg numeric(5, 1) default 0;

-- Comment on columns
comment on column elements.position_x_mm is 'Physical X position in building floor plan (mm from bottom-left origin). Extracted from BF/structural drawings.';
comment on column elements.position_y_mm is 'Physical Y position in building floor plan (mm from bottom-left origin). Extracted from BF/structural drawings.';
comment on column elements.rotation_deg is 'Rotation in degrees (0 = horizontal, 90 = vertical). Extracted from structural drawings.';

-- Index for quickly finding elements that have positions (for building view)
create index if not exists idx_elements_has_position
  on elements (project_id, floor, building_id)
  where position_x_mm is not null and position_y_mm is not null;
