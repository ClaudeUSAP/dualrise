-- Add missing columns to saved_searches table
ALTER TABLE public.saved_searches 
ADD COLUMN IF NOT EXISTS last_notification_sent TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS match_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS new_matches_count INTEGER DEFAULT 0;

-- Create search run history table to track when searches are executed
CREATE TABLE IF NOT EXISTS public.search_run_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  saved_search_id UUID NOT NULL REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  run_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  matches_found INTEGER DEFAULT 0,
  new_matches INTEGER DEFAULT 0,
  notification_sent BOOLEAN DEFAULT false
);

-- Create search notifications table to track what notifications were sent
CREATE TABLE IF NOT EXISTS public.search_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  saved_search_id UUID NOT NULL REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'in_app')),
  subject TEXT,
  content JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT
);

-- Enable RLS on new tables
ALTER TABLE public.search_run_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for search_run_history
CREATE POLICY "Coaches can view history of their searches" 
ON public.search_run_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.saved_searches 
    WHERE saved_searches.id = search_run_history.saved_search_id 
    AND saved_searches.coach_id = auth.uid()
  )
);

-- RLS Policies for search_notifications
CREATE POLICY "Coaches can view their notifications" 
ON public.search_notifications 
FOR SELECT 
USING (coach_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_search_run_history_saved_search ON public.search_run_history(saved_search_id);
CREATE INDEX IF NOT EXISTS idx_search_notifications_coach ON public.search_notifications(coach_id);
CREATE INDEX IF NOT EXISTS idx_search_notifications_status ON public.search_notifications(status);

-- Update the saved_searches table to use JSONB for search_criteria
ALTER TABLE public.saved_searches 
ALTER COLUMN search_criteria TYPE JSONB USING 
  CASE 
    WHEN search_criteria IS NULL THEN '{}'::jsonb
    ELSE search_criteria::jsonb
  END;