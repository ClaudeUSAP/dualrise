-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.search_notifications CASCADE;
DROP TABLE IF EXISTS public.search_run_history CASCADE;
DROP TABLE IF EXISTS public.saved_searches CASCADE;

-- Create saved searches table
CREATE TABLE public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  search_criteria JSONB NOT NULL DEFAULT '{}',
  is_alert_enabled BOOLEAN DEFAULT false,
  alert_frequency TEXT DEFAULT 'weekly' CHECK (alert_frequency IN ('daily', 'weekly', 'immediate')),
  last_run TIMESTAMP WITH TIME ZONE,
  last_notification_sent TIMESTAMP WITH TIME ZONE,
  match_count INTEGER DEFAULT 0,
  new_matches_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create search run history table to track when searches are executed
CREATE TABLE public.search_run_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  saved_search_id UUID NOT NULL REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  run_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  matches_found INTEGER DEFAULT 0,
  new_matches INTEGER DEFAULT 0,
  notification_sent BOOLEAN DEFAULT false
);

-- Create search notifications table to track what notifications were sent
CREATE TABLE public.search_notifications (
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

-- Enable RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_run_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_searches
CREATE POLICY "Coaches can view their own saved searches" 
ON public.saved_searches 
FOR SELECT 
USING (coach_id = auth.uid());

CREATE POLICY "Coaches can create their own saved searches" 
ON public.saved_searches 
FOR INSERT 
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can update their own saved searches" 
ON public.saved_searches 
FOR UPDATE 
USING (coach_id = auth.uid());

CREATE POLICY "Coaches can delete their own saved searches" 
ON public.saved_searches 
FOR DELETE 
USING (coach_id = auth.uid());

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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_saved_searches_updated_at
BEFORE UPDATE ON public.saved_searches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_saved_searches_coach_id ON public.saved_searches(coach_id);
CREATE INDEX idx_saved_searches_alert_enabled ON public.saved_searches(is_alert_enabled);
CREATE INDEX idx_search_run_history_saved_search ON public.search_run_history(saved_search_id);
CREATE INDEX idx_search_notifications_coach ON public.search_notifications(coach_id);
CREATE INDEX idx_search_notifications_status ON public.search_notifications(status);