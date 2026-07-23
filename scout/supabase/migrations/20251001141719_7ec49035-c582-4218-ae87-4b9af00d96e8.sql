-- Step 1: Create an enum for roles (skip if already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'coach');
    END IF;
END $$;

-- Step 2: Create user_roles table with proper security (skip if already exists)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Step 3: Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create a security definer function to check roles (prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 5: Migrate existing roles from users table to user_roles
-- Only migrate roles for users that exist in auth.users
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, u.role::app_role
FROM public.users u
WHERE u.role IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id)
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 6: Update existing RLS policies to use the new has_role function

-- Update policies for athletes table
DROP POLICY IF EXISTS "Active coaches and admins can view athletes" ON public.athletes;
CREATE POLICY "Active coaches and admins can view athletes" 
ON public.athletes 
FOR SELECT 
USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.status = 'active'
        AND (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'))
    )
);

DROP POLICY IF EXISTS "Only admins can insert athletes" ON public.athletes;
CREATE POLICY "Only admins can insert athletes" 
ON public.athletes 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can update athletes" ON public.athletes;
CREATE POLICY "Only admins can update athletes" 
ON public.athletes 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can delete athletes" ON public.athletes;
CREATE POLICY "Only admins can delete athletes" 
ON public.athletes 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Update policies for tournaments
DROP POLICY IF EXISTS "Only admins can insert tournaments" ON public.tournaments;
CREATE POLICY "Only admins can insert tournaments" 
ON public.tournaments 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can update tournaments" ON public.tournaments;
CREATE POLICY "Only admins can update tournaments" 
ON public.tournaments 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can delete tournaments" ON public.tournaments;
CREATE POLICY "Only admins can delete tournaments" 
ON public.tournaments 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Update policies for tournament_results
DROP POLICY IF EXISTS "Only admins can insert tournament results" ON public.tournament_results;
CREATE POLICY "Only admins can insert tournament results" 
ON public.tournament_results 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can update tournament results" ON public.tournament_results;
CREATE POLICY "Only admins can update tournament results" 
ON public.tournament_results 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can delete tournament results" ON public.tournament_results;
CREATE POLICY "Only admins can delete tournament results" 
ON public.tournament_results 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Update policies for contact_requests
DROP POLICY IF EXISTS "Admins can see all contact requests" ON public.contact_requests;
CREATE POLICY "Admins can see all contact requests" 
ON public.contact_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Update policies for athlete_statistics
DROP POLICY IF EXISTS "Active coaches and admins can view statistics" ON public.athlete_statistics;
CREATE POLICY "Active coaches and admins can view statistics" 
ON public.athlete_statistics 
FOR SELECT 
USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.status = 'active'
        AND (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'))
    )
);

DROP POLICY IF EXISTS "Only admins can insert statistics" ON public.athlete_statistics;
CREATE POLICY "Only admins can insert statistics" 
ON public.athlete_statistics 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can update statistics" ON public.athlete_statistics;
CREATE POLICY "Only admins can update statistics" 
ON public.athlete_statistics 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can delete statistics" ON public.athlete_statistics;
CREATE POLICY "Only admins can delete statistics" 
ON public.athlete_statistics 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Update policies for users table - prevent users from updating their own role
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Create a trigger function to prevent role updates
CREATE OR REPLACE FUNCTION public.prevent_role_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot update role field directly';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent role updates
DROP TRIGGER IF EXISTS prevent_user_role_update ON public.users;
CREATE TRIGGER prevent_user_role_update
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_update();

-- Recreate the update policy without role check in WITH CHECK
CREATE POLICY "Users can update own profile" 
ON public.users 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Step 7: Update get_current_user_role function to use user_roles table
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE PLPGSQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return the role of the current authenticated user from user_roles table
  RETURN (
    SELECT role::TEXT 
    FROM public.user_roles 
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- Step 8: RLS policies for user_roles table itself
-- Only admins can view user roles
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Only admins can insert user roles
CREATE POLICY "Admins can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update user roles
CREATE POLICY "Admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete user roles
CREATE POLICY "Admins can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));