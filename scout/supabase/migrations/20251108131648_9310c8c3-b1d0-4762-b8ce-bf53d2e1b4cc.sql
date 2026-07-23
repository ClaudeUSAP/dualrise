-- Fix search_path for generate_athlete_slug function
CREATE OR REPLACE FUNCTION generate_athlete_slug(first text, last text, athlete_id uuid)
RETURNS text 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 1;
BEGIN
  -- Create base slug from first and last name
  base_slug := lower(trim(regexp_replace(first || '-' || last, '[^a-zA-Z0-9-]', '-', 'g')));
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check for collisions and append number if needed
  WHILE EXISTS (SELECT 1 FROM athletes WHERE slug = final_slug AND id != athlete_id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Fix search_path for auto_generate_slug function
CREATE OR REPLACE FUNCTION auto_generate_slug()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR (OLD.first_name IS NOT NULL AND (NEW.first_name != OLD.first_name OR NEW.last_name != OLD.last_name)) THEN
    NEW.slug := generate_athlete_slug(NEW.first_name, NEW.last_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;