-- Add missing columns to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS is_priority boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS action_url text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS description text;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read 
ON notifications(user_id, is_read);