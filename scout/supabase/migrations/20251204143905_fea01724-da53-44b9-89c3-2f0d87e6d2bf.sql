-- Remove the duplicate 'coach' role for gf@usathleticperformance.com (keep agent role only)
DELETE FROM user_roles 
WHERE user_id = 'cda18bd1-11d8-4d70-b397-25d7f59f012c' 
AND role = 'coach';