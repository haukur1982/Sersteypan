-- Migration: Visual Verifications Table
-- Purpose: Track when drivers verify elements using the Visual ID feature
-- Part of Phase 4: Feature Completion

-- Create the visual_verifications table
CREATE TABLE IF NOT EXISTS visual_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    element_id UUID NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('verified', 'rejected')),
    rejection_reason TEXT,
    notes TEXT,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE visual_verifications IS 'Records of driver visual verification of elements before loading';
COMMENT ON COLUMN visual_verifications.status IS 'verified = element matches 3D model, rejected = element does not match';
COMMENT ON COLUMN visual_verifications.rejection_reason IS 'Required when status is rejected';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_visual_verifications_element_id ON visual_verifications(element_id);
CREATE INDEX IF NOT EXISTS idx_visual_verifications_driver_id ON visual_verifications(driver_id);
CREATE INDEX IF NOT EXISTS idx_visual_verifications_verified_at ON visual_verifications(verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_visual_verifications_status ON visual_verifications(status);

-- Enable RLS
ALTER TABLE visual_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Drivers can view their own verifications
CREATE POLICY "Drivers can view own verifications"
    ON visual_verifications
    FOR SELECT
    USING (
        driver_id = auth.uid()
        OR get_user_role() IN ('admin', 'factory_manager')
    );

-- Drivers can create verifications
CREATE POLICY "Drivers can create verifications"
    ON visual_verifications
    FOR INSERT
    WITH CHECK (
        driver_id = auth.uid()
        AND get_user_role() = 'driver'
    );

-- Admins can view all verifications
CREATE POLICY "Admins can view all verifications"
    ON visual_verifications
    FOR SELECT
    USING (get_user_role() = 'admin');

-- Also add a column to elements to track latest verification (optional but useful)
ALTER TABLE elements
ADD COLUMN IF NOT EXISTS visual_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS visual_verified_by UUID REFERENCES profiles(id);

-- Create a function to update element verification status when a verification is created
CREATE OR REPLACE FUNCTION update_element_visual_verification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'verified' THEN
        UPDATE elements
        SET
            visual_verified_at = NEW.verified_at,
            visual_verified_by = NEW.driver_id,
            updated_at = NOW()
        WHERE id = NEW.element_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update element when verification is created
DROP TRIGGER IF EXISTS trigger_update_element_visual_verification ON visual_verifications;
CREATE TRIGGER trigger_update_element_visual_verification
    AFTER INSERT ON visual_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_element_visual_verification();

-- Grant permissions
GRANT SELECT, INSERT ON visual_verifications TO authenticated;
