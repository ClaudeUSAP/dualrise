-- Add missing columns to athletes table for form field persistence

-- Add email column for athlete contact
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS email TEXT;

-- Add phone column for athlete contact  
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add cover_photo column for cover images
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS cover_photo TEXT;

-- Add featured column for featured athletes
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Add preferred_states column for state preferences
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS preferred_states TEXT;