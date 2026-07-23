-- Add student_type field to athletes table
ALTER TABLE public.athletes 
ADD COLUMN student_type text DEFAULT 'first_year' 
CHECK (student_type IN ('first_year', 'transfer'));

-- Add comment for clarity
COMMENT ON COLUMN public.athletes.student_type IS 'Indicates whether the athlete is a first-year student or a transfer student';