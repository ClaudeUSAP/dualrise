-- Add start_date, end_date, and status columns to tournaments table
ALTER TABLE tournaments 
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE,
ADD COLUMN status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled', 'archived'));