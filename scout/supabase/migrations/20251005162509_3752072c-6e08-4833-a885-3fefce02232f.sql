-- Add WhatsApp number and brochure URL to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS brochure_url TEXT;

-- Create storage bucket for coach brochures
INSERT INTO storage.buckets (id, name, public)
VALUES ('coach-brochures', 'coach-brochures', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for coach brochures
-- Coaches can upload their own brochures
CREATE POLICY "Coaches can upload own brochure"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'coach-brochures' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Coaches can view their own brochures
CREATE POLICY "Coaches can view own brochure"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'coach-brochures' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Coaches can update their own brochures
CREATE POLICY "Coaches can update own brochure"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'coach-brochures' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Coaches can delete their own brochures
CREATE POLICY "Coaches can delete own brochure"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'coach-brochures' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can view all brochures
CREATE POLICY "Admins can view all brochures"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'coach-brochures' 
  AND has_role(auth.uid(), 'admin'::app_role)
);