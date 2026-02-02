-- Migration: Add element_types table for admin-configurable element types
-- This replaces hardcoded element types in the application code

-- Create the element_types table
CREATE TABLE IF NOT EXISTS element_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,           -- Internal key: 'wall', 'filigran', etc.
  label_is TEXT NOT NULL,             -- Icelandic display label
  label_en TEXT NOT NULL,             -- English display label
  sort_order INT DEFAULT 0,           -- For ordering in dropdowns
  is_active BOOLEAN DEFAULT true,     -- Soft delete support
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for common queries
CREATE INDEX idx_element_types_active ON element_types(is_active, sort_order);
CREATE INDEX idx_element_types_key ON element_types(key);

-- Seed with existing element types (matches current hardcoded values)
INSERT INTO element_types (key, label_is, label_en, sort_order) VALUES
  ('wall', 'Veggur', 'Wall', 1),
  ('filigran', 'Filigran', 'Floor Slab', 2),
  ('staircase', 'Stigi', 'Staircase', 3),
  ('balcony', 'Svalir', 'Balcony', 4),
  ('ceiling', 'Þak', 'Ceiling', 5),
  ('column', 'Súla', 'Column', 6),
  ('beam', 'Bita', 'Beam', 7),
  ('other', 'Annað', 'Other', 99)
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE element_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone (authenticated or not) can read active element types
CREATE POLICY "Anyone can read element types"
  ON element_types
  FOR SELECT
  USING (true);

-- Only admins can insert new element types
CREATE POLICY "Admins can insert element types"
  ON element_types
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update element types
CREATE POLICY "Admins can update element types"
  ON element_types
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete element types (prefer soft delete via is_active)
CREATE POLICY "Admins can delete element types"
  ON element_types
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_element_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER element_types_updated_at
  BEFORE UPDATE ON element_types
  FOR EACH ROW
  EXECUTE FUNCTION update_element_types_updated_at();
