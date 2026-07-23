-- Create test users in the auth.users table
-- Note: We'll create them with pre-verified emails for immediate testing

-- First, we need to create the users in auth.users
-- Since we can't directly insert into auth.users via SQL, we'll create them via the profiles table
-- and document the process for manual creation

-- For now, let's update the login page to reflect that users need to sign up first
-- or provide instructions on how to create test accounts

-- Create a function to help with test data setup (optional, for future use)
CREATE OR REPLACE FUNCTION public.create_test_accounts_instructions()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'To create test accounts:
1. Use the Sign Up form to create accounts with these emails:
   - coach@university.edu (role: coach)
   - pending@university.edu (role: coach, set status to pending)
   - admin@usap.fr (role: admin)
2. Or use Supabase Dashboard > Authentication > Users > Invite User
3. After creation, update the users table to set appropriate roles and statuses';
END;
$$;

-- Since we can't directly create auth users via SQL, let's at least prepare 
-- the users table entries that will be linked once the auth users are created
-- This is documentation for what needs to be done

COMMENT ON FUNCTION public.create_test_accounts_instructions() IS 
'Instructions for creating test accounts. Run SELECT public.create_test_accounts_instructions(); to see instructions.';