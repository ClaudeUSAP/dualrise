-- Normalize existing sex values in athletes table
-- Convert Male/Female variations to Men/Women for consistency
UPDATE athletes 
SET sex = CASE 
  WHEN LOWER(TRIM(sex)) IN ('male', 'm', 'man') THEN 'Men'
  WHEN LOWER(TRIM(sex)) IN ('female', 'f', 'woman') THEN 'Women'
  ELSE sex
END
WHERE sex IS NOT NULL;