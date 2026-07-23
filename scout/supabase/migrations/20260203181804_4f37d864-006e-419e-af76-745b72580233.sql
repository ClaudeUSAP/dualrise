-- Sprint 1: Complete universities migration with function drop first
-- Step 0: Drop the existing function first to avoid return type conflict
DROP FUNCTION IF EXISTS public.admin_list_coaches();

-- Step 1: Create the universities table
CREATE TABLE public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  division TEXT,
  state TEXT,
  verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Enable RLS on universities
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

-- Step 3: RLS Policy - Authenticated users can view universities
CREATE POLICY "Authenticated users can view universities"
ON public.universities FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Step 4: RLS Policy - Admins can manage universities
CREATE POLICY "Admins can manage universities"
ON public.universities FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 5: Populate universities from existing school_name data (cleaned)
INSERT INTO public.universities (name, verified)
SELECT DISTINCT TRIM(school_name), true
FROM public.users 
WHERE school_name IS NOT NULL 
  AND TRIM(school_name) != ''
  AND school_name NOT LIKE '%@%'
  AND LENGTH(TRIM(school_name)) > 3
  AND UPPER(TRIM(school_name)) NOT IN ('USAP', 'US ATHLETIC PERFORMANCE', 'ROS')
ON CONFLICT (name) DO NOTHING;

-- Step 6: Add university_id column to users table
ALTER TABLE public.users 
ADD COLUMN university_id UUID REFERENCES public.universities(id);

-- Step 7: Link existing coaches to their university
UPDATE public.users u
SET university_id = uni.id
FROM public.universities uni
WHERE UPPER(TRIM(u.school_name)) = UPPER(TRIM(uni.name));

-- Step 8: Recreate admin_list_coaches with division column
CREATE OR REPLACE FUNCTION public.admin_list_coaches()
RETURNS TABLE(
  id uuid, 
  email text, 
  first_name text, 
  last_name text, 
  full_name text, 
  school_name text, 
  division text,
  status text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  recruiting_needs text, 
  search_count bigint, 
  favorites_count bigint, 
  contact_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.full_name,
    COALESCE(uni.name, u.school_name) as school_name,
    uni.division,
    u.status,
    u.created_at,
    u.updated_at,
    u.recruiting_needs,
    (SELECT COUNT(*) FROM saved_searches s WHERE s.coach_id = u.id) AS search_count,
    (SELECT COUNT(*) FROM favorites f WHERE f.coach_id = u.id) AS favorites_count,
    (SELECT COUNT(*) FROM contact_requests c WHERE c.coach_id = u.id) AS contact_count
  FROM public.users u
  INNER JOIN public.user_roles r ON r.user_id = u.id
  LEFT JOIN public.universities uni ON uni.id = u.university_id
  WHERE r.role = 'coach'::app_role
  ORDER BY u.created_at DESC;
END;
$function$;