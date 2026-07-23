-- First, ensure we have proper test users in the users table
-- These will be linked to auth.users when they sign up

-- Create a function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    status,
    school_name,
    position
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'role', 'coach'),
    'active',
    new.raw_user_meta_data->>'school_name',
    new.raw_user_meta_data->>'position'
  );
  RETURN new;
END;
$$;

-- Create trigger for automatic user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Ensure RLS policies allow users to read their own data
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.users FOR SELECT
  USING (true);

-- Add sample athletes data if table is empty
INSERT INTO public.athletes (first_name, last_name, country, academic_gpa, graduation_year, sex, status)
SELECT 'John', 'Smith', 'USA', 3.8, 2025, 'Male', 'Uncommitted'
WHERE NOT EXISTS (SELECT 1 FROM public.athletes LIMIT 1)
UNION ALL
SELECT 'Emma', 'Johnson', 'USA', 3.9, 2025, 'Female', 'Uncommitted'
WHERE NOT EXISTS (SELECT 1 FROM public.athletes LIMIT 1)
UNION ALL
SELECT 'Michael', 'Williams', 'Canada', 3.7, 2026, 'Male', 'Uncommitted'
WHERE NOT EXISTS (SELECT 1 FROM public.athletes LIMIT 1)
UNION ALL
SELECT 'Sophie', 'Brown', 'UK', 3.85, 2025, 'Female', 'Uncommitted'
WHERE NOT EXISTS (SELECT 1 FROM public.athletes LIMIT 1)
UNION ALL
SELECT 'Lucas', 'Davis', 'France', 3.6, 2026, 'Male', 'Committed'
WHERE NOT EXISTS (SELECT 1 FROM public.athletes LIMIT 1);

-- Add some sample tournament results
INSERT INTO public.tournament_results (athlete_id, tournament_id, position, total_score)
SELECT 
  a.id,
  t.id,
  floor(random() * 20 + 1)::integer,
  floor(random() * 10 + 280)::integer
FROM 
  (SELECT id FROM public.athletes LIMIT 3) a
  CROSS JOIN
  (SELECT id FROM public.tournaments LIMIT 5) t
WHERE NOT EXISTS (SELECT 1 FROM public.tournament_results LIMIT 1);