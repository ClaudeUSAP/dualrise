-- Add sample favorites for coach@university.edu
-- First, let's add some favorites for the coach account
INSERT INTO public.favorites (coach_id, athlete_id, status, notes)
SELECT 
  (SELECT id FROM public.users WHERE email = 'coach@university.edu'),
  a.id,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY a.created_at DESC) = 1 THEN 'highly_interested'
    WHEN ROW_NUMBER() OVER (ORDER BY a.created_at DESC) = 2 THEN 'contacted'
    WHEN ROW_NUMBER() OVER (ORDER BY a.created_at DESC) = 3 THEN 'interested'
    ELSE 'monitoring'
  END as status,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY a.created_at DESC) = 1 THEN 'Top prospect - excellent academic and athletic profile'
    WHEN ROW_NUMBER() OVER (ORDER BY a.created_at DESC) = 2 THEN 'Strong player, reached out via email'
    WHEN ROW_NUMBER() OVER (ORDER BY a.created_at DESC) = 3 THEN 'Good potential, monitoring progress'
    ELSE 'Tracking tournament performance'
  END as notes
FROM public.athletes a
WHERE NOT EXISTS (
  SELECT 1 FROM public.favorites f 
  WHERE f.athlete_id = a.id 
  AND f.coach_id = (SELECT id FROM public.users WHERE email = 'coach@university.edu')
)
LIMIT 4;

-- Also ensure we have some contact requests for variety
INSERT INTO public.contact_requests (coach_id, athlete_id, message, interest_level, preferred_contact, status)
SELECT 
  (SELECT id FROM public.users WHERE email = 'coach@university.edu'),
  f.athlete_id,
  'I am very interested in learning more about your golf program and would love to discuss scholarship opportunities.',
  'High',
  'email',
  'pending'
FROM public.favorites f
WHERE f.coach_id = (SELECT id FROM public.users WHERE email = 'coach@university.edu')
LIMIT 2
ON CONFLICT DO NOTHING;