-- Enable full replica identity for complete row data in notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add notifications table to realtime publication so clients can subscribe to changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;