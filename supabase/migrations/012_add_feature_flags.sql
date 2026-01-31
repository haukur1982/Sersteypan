-- Add preferences column to profiles for storing feature flags and user settings
-- Default to empty object if null
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Helper function to check if a user has a specific feature enabled
-- Usage: select has_feature('visual_pilot');
CREATE OR REPLACE FUNCTION has_feature(feature_key text)
RETURNS boolean AS $$
DECLARE
  user_prefs jsonb;
BEGIN
  SELECT preferences INTO user_prefs FROM profiles WHERE id = auth.uid();
  RETURN COALESCE((user_prefs->'features'->>feature_key)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
