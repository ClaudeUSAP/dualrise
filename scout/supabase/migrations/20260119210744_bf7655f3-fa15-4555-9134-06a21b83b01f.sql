-- Drop conflicting category constraints
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS check_category_values;
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_category_check;

-- Add single updated constraint with all allowed category values
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_category_check 
CHECK (category = ANY (ARRAY['National', 'International', 'National Team', 'Club Competition', 'PRO']));