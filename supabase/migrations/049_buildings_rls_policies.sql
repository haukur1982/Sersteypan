-- ============================================================
-- Migration 049: RLS policies for buildings table
-- The buildings table had RLS enabled but NO policies, so all
-- authenticated queries returned 0 rows. This fixes the
-- Framvinda building selector (and any other building queries).
-- ============================================================

-- Admin: full access
CREATE POLICY "admin_full_access_buildings"
  ON buildings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.is_active = true
    )
  );

-- Factory manager: read access to all buildings
CREATE POLICY "factory_manager_read_buildings"
  ON buildings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'factory_manager'
      AND profiles.is_active = true
    )
  );

-- Buyer: read access to buildings in their company's projects
CREATE POLICY "buyer_read_buildings"
  ON buildings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN profiles pr ON pr.company_id = p.company_id
      WHERE p.id = buildings.project_id
      AND pr.id = auth.uid()
      AND pr.role = 'buyer'
      AND pr.is_active = true
    )
  );

-- Driver: read access to buildings in projects they have deliveries for
CREATE POLICY "driver_read_buildings"
  ON buildings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries d
      JOIN profiles pr ON pr.id = d.driver_id
      WHERE d.project_id = buildings.project_id
      AND pr.id = auth.uid()
      AND pr.role = 'driver'
      AND pr.is_active = true
    )
  );
