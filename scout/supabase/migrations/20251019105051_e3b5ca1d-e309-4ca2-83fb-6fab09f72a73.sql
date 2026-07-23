-- Make location column nullable in tournaments table
ALTER TABLE tournaments ALTER COLUMN location DROP NOT NULL;