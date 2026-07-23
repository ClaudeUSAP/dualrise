-- Fix the user with mismatched roles (admin@usap.com)
UPDATE user_roles 
SET role = 'admin'::app_role 
WHERE user_id = 'f41b1a04-609e-4b62-9e59-97285c8daf25';