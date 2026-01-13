-- Add phone number support to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- Add index for faster phone number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone_number);

-- Comment
COMMENT ON COLUMN profiles.phone_number IS 'Normalized phone number (E.164 format) for contact discovery';
