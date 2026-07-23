-- Backfill missing users from auth.users into public.users
-- This ensures all authenticated users have the necessary profile and role data for RLS

-- Step 1: Insert missing user profiles with active status
INSERT INTO public.users (id, email, full_name, first_name, last_name, role, status)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'first_name', SPLIT_PART(COALESCE(au.raw_user_meta_data->>'full_name', au.email), ' ', 1)),
  COALESCE(au.raw_user_meta_data->>'last_name', CASE 
    WHEN POSITION(' ' IN COALESCE(au.raw_user_meta_data->>'full_name', '')) > 0 
    THEN SUBSTRING(COALESCE(au.raw_user_meta_data->>'full_name', '') FROM POSITION(' ' IN COALESCE(au.raw_user_meta_data->>'full_name', '')) + 1)
    ELSE ''
  END),
  'coach',
  'active'
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE u.id IS NULL;

-- Step 2: Insert missing user roles (default to coach)
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id,
  'coach'::app_role
FROM public.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL;

-- Step 3: Promote known admin emails to admin role
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id,
  'admin'::app_role
FROM public.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'admin'::app_role
WHERE u.email IN ('admin@usap.fr', 'admin@coachcorner.com')
  AND ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;