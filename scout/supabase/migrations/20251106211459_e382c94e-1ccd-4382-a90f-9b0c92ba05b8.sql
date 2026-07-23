-- Add star_rating column to athletes table
ALTER TABLE athletes 
ADD COLUMN star_rating integer DEFAULT 3 CHECK (star_rating >= 0 AND star_rating <= 6);

-- Add comment for documentation
COMMENT ON COLUMN athletes.star_rating IS 'Manual star rating from 0-6 stars based on overall athlete quality';