-- Clean up true duplicates in tournaments table

-- 1. Merge 2023 Bordeaux Grand Prix Male duplicates
-- Keep: 8f5bb3e8-9251-4fdf-a14c-b5943aa5c44f
-- Delete: 0938f4d8-1cf9-42b4-911e-bd0c77d95e21

-- First, update all tournament_results to point to the kept tournament
UPDATE tournament_results 
SET tournament_id = '8f5bb3e8-9251-4fdf-a14c-b5943aa5c44f'
WHERE tournament_id = '0938f4d8-1cf9-42b4-911e-bd0c77d95e21';

-- Delete the duplicate tournament
DELETE FROM tournaments 
WHERE id = '0938f4d8-1cf9-42b4-911e-bd0c77d95e21';

-- 2. Merge the three "Grand Prix Du Bordelais - Trophy F. Blanc" Male entries  
-- Keep: 0dd1c9c4-9131-46ae-b939-648e0535a1de
-- Delete: 9b38a8e2-234f-4b01-935a-4bcf3b6fca1b, 20721c0d-ea87-4feb-94af-7f96f205f3ba

-- Update all tournament_results to point to the kept tournament
UPDATE tournament_results 
SET tournament_id = '0dd1c9c4-9131-46ae-b939-648e0535a1de'
WHERE tournament_id IN ('9b38a8e2-234f-4b01-935a-4bcf3b6fca1b', '20721c0d-ea87-4feb-94af-7f96f205f3ba');

-- Update the kept tournament's name to the full, non-truncated version
UPDATE tournaments 
SET name = 'Grand Prix Du Bordelais - Trophy F. Blanc'
WHERE id = '0dd1c9c4-9131-46ae-b939-648e0535a1de';

-- Delete the duplicate tournaments
DELETE FROM tournaments 
WHERE id IN ('9b38a8e2-234f-4b01-935a-4bcf3b6fca1b', '20721c0d-ea87-4feb-94af-7f96f205f3ba');

-- 3. Add a unique constraint to prevent future duplicates (when all fields are filled)
-- This will help prevent exact duplicates but allow NULL values for incomplete data
ALTER TABLE tournaments 
ADD CONSTRAINT unique_tournament_full_details 
UNIQUE NULLS NOT DISTINCT (name, year, sex, location, course_rating, course_slope, course_par, yardage);