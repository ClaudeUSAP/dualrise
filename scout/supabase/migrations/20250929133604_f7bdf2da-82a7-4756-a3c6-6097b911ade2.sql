-- Fix the last function without search_path
CREATE OR REPLACE FUNCTION public.create_test_accounts_instructions()
RETURNS text
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  RETURN 'To create test accounts:
1. Use the Sign Up form to create accounts with these emails:
   - coach@university.edu (role: coach)
   - pending@university.edu (role: coach, set status to pending)
   - admin@usap.fr (role: admin)
2. Or use Supabase Dashboard > Authentication > Users > Invite User
3. After creation, update the users table to set appropriate roles and statuses';
END;
$function$;