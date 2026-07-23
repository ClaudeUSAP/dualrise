-- Delete duplicate coach role from admin@usap.fr
DELETE FROM user_roles 
WHERE user_id = '7b69b2c6-e3bd-44d1-9f96-908fb3c8ced7' 
AND role = 'coach';

-- Fix lnh@laetitia.co: update role to admin
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = '225f9c2b-e59d-4130-99ad-0014b6fc8710';

-- Fix lnh@laetitia.co: set status to active
UPDATE users 
SET status = 'active' 
WHERE id = '225f9c2b-e59d-4130-99ad-0014b6fc8710';