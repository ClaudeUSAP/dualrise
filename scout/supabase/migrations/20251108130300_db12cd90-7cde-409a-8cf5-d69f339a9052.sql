-- Gender Standardization Migration
-- This migration enforces 'Men' and 'Women' as the only valid gender values across the database

-- Step 1: Clean up existing data in athletes table
UPDATE athletes 
SET sex = 'Men' 
WHERE sex IN ('Male', 'M', 'Man', 'male', 'men', 'man', 'm');

UPDATE athletes 
SET sex = 'Women' 
WHERE sex IN ('Female', 'F', 'Woman', 'female', 'women', 'woman', 'f');

-- Step 2: Clean up existing data in tournaments table
UPDATE tournaments 
SET sex = 'Men' 
WHERE sex IN ('Male', 'M', 'Man', 'male', 'men', 'man', 'm', 'MALE');

UPDATE tournaments 
SET sex = 'Women' 
WHERE sex IN ('Female', 'F', 'Woman', 'female', 'women', 'woman', 'f', 'FEMALE');

-- Step 3: Add check constraint for athletes.sex (nullable)
ALTER TABLE athletes 
DROP CONSTRAINT IF EXISTS athletes_sex_check;

ALTER TABLE athletes 
ADD CONSTRAINT athletes_sex_check 
CHECK (sex IS NULL OR sex IN ('Men', 'Women'));

-- Step 4: Add check constraint for tournaments.sex (NOT NULL)
ALTER TABLE tournaments 
DROP CONSTRAINT IF EXISTS tournaments_sex_check;

ALTER TABLE tournaments 
ADD CONSTRAINT tournaments_sex_check 
CHECK (sex IN ('Men', 'Women'));

-- Verify the constraints
COMMENT ON CONSTRAINT athletes_sex_check ON athletes IS 'Ensures sex field only contains Men or Women';
COMMENT ON CONSTRAINT tournaments_sex_check ON tournaments IS 'Ensures sex field only contains Men or Women (required)';