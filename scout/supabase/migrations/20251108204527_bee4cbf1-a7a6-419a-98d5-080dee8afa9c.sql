-- Allow service role to insert notifications for any user
DROP POLICY IF EXISTS "Service role can insert all notifications" ON notifications;

CREATE POLICY "Service role can insert all notifications"
ON notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- Ensure users can still read their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
USING (user_id = auth.uid());

-- Ensure users can update their own notifications
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
USING (user_id = auth.uid());

-- Ensure users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

CREATE POLICY "Users can delete their own notifications"
ON notifications
FOR DELETE
USING (user_id = auth.uid());