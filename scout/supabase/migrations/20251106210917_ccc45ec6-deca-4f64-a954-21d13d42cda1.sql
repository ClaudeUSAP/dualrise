-- Create storage bucket for athlete images
INSERT INTO storage.buckets (id, name, public)
VALUES ('athlete-images', 'athlete-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for athlete images
-- Admins and agents can upload athlete images
CREATE POLICY "Admins can upload athlete images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'athlete-images' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role))
);

-- Admins and agents can view athlete images
CREATE POLICY "Admins can view athlete images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'athlete-images'
);

-- Admins and agents can update athlete images
CREATE POLICY "Admins can update athlete images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'athlete-images' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role))
);

-- Admins and agents can delete athlete images
CREATE POLICY "Admins can delete athlete images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'athlete-images' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role))
);

-- Public can view athlete images (since bucket is public)
CREATE POLICY "Public can view athlete images"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'athlete-images');