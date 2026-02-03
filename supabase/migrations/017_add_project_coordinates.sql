-- Migration: Add GPS coordinates to projects for maps integration
-- This enables geocoding project addresses and showing locations on maps

-- Add latitude and longitude columns to projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add index for geospatial queries (if we ever need to find nearby projects)
CREATE INDEX IF NOT EXISTS idx_projects_coordinates
ON projects (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN projects.latitude IS 'GPS latitude coordinate for project location (WGS84)';
COMMENT ON COLUMN projects.longitude IS 'GPS longitude coordinate for project location (WGS84)';
