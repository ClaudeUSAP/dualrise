# Test Accounts Setup & Credentials

## Overview
This document provides instructions for creating comprehensive test accounts and their credentials for testing all user journeys.

## Test Accounts Required

### 1. Admin Account
- **Email**: `admin-test@golfrecruiting.com`
- **Role**: Admin
- **Status**: Active
- **Purpose**: Test all admin functionalities

### 2. Agent Account
- **Email**: `agent-test@golfrecruiting.com`
- **Role**: Agent
- **Status**: Active
- **Purpose**: Test agent-specific functionalities

### 3. Active Coach Account
- **Email**: `coach-active@university.edu`
- **Role**: Coach
- **Status**: Active
- **Purpose**: Test full coach access and features

### 4. Pending Coach Account
- **Email**: `coach-pending@university.edu`
- **Role**: Coach
- **Status**: Pending
- **Purpose**: Test restricted access for pending coaches

---

## Account Creation Instructions

### Method 1: Using Admin Portal (Recommended)

**For Admin & Agent Accounts:**
1. Log in as an existing admin
2. Navigate to: Admin Dashboard → User Management
3. Click "Add New Admin/Agent"
4. Fill in the form with test account details
5. Note the generated password
6. Click "Create User"

**For Coach Accounts:**
1. Use the registration page: `/register`
2. Fill in registration form with test coach details
3. For **Active Coach**: Admin must approve in User Management
4. For **Pending Coach**: Leave status as pending after registration

### Method 2: Using Supabase Dashboard

1. Go to: [Supabase Authentication](https://supabase.com/dashboard/project/bfxhruvkzidvznsyyryp/auth/users)
2. Click "Invite User"
3. Enter email address
4. User will receive invitation email
5. After user is created, update their role and status in the database:

```sql
-- Set role (run in SQL Editor)
INSERT INTO user_roles (user_id, role) 
VALUES ('USER_ID_HERE', 'admin'); -- or 'agent' or 'coach'

-- Set status (run in SQL Editor)
UPDATE users 
SET status = 'active' -- or 'pending'
WHERE id = 'USER_ID_HERE';

-- Add additional profile data
UPDATE users 
SET 
  full_name = 'Test Admin User',
  first_name = 'Test',
  last_name = 'Admin',
  school_name = 'Test University',
  position = 'Head Coach'
WHERE id = 'USER_ID_HERE';
```

### Method 3: Using Edge Function (For Bulk Creation)

Create a one-time edge function call to set up all test accounts:

```typescript
// Call from SQL Editor or create a temporary script
SELECT create_test_accounts();
```

---

## Test Account Credentials Template

| Account Type | Email | Password | Role | Status | Access Level |
|-------------|-------|----------|------|--------|--------------|
| Admin | `admin-test@golfrecruiting.com` | `TestAdmin2025!` | admin | active | Full system access |
| Agent | `agent-test@golfrecruiting.com` | `TestAgent2025!` | agent | active | Athlete & tournament management |
| Active Coach | `coach-active@university.edu` | `TestCoach2025!` | coach | active | Full coach features |
| Pending Coach | `coach-pending@university.edu` | `TestPending2025!` | coach | pending | Limited/no access |

---

## Post-Creation Verification Checklist

### For Each Account:
- [ ] User exists in `auth.users` table
- [ ] User exists in `users` table with correct profile data
- [ ] User has correct role in `user_roles` table
- [ ] User has correct status in `users` table
- [ ] User can log in successfully
- [ ] User sees appropriate UI based on role

### SQL Verification Queries

```sql
-- Check all test accounts
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.status,
  ur.role
FROM auth.users au
JOIN users u ON au.id = u.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email LIKE '%test%' OR u.email LIKE '%@golfrecruiting.com';

-- Verify RLS policies work
SET ROLE authenticated;
SELECT current_user_is_active();
SELECT get_current_user_role();
```

---

## Security Notes

⚠️ **Important Security Considerations:**
- These are **test accounts only** - use strong unique passwords in production
- Delete or disable test accounts before going live
- Never commit actual passwords to version control
- Use password manager to store test credentials
- Rotate test passwords regularly
- Monitor test account activity for unauthorized access

---

## Troubleshooting

### Account Creation Fails
- Check edge function logs: [Create Admin User Logs](https://supabase.com/dashboard/project/bfxhruvkzidvznsyyryp/functions/create-admin-user/logs)
- Verify `create-admin-user` function is deployed
- Check if email already exists in system

### Login Fails
- Verify email confirmation settings in Supabase Auth
- Check user status is not 'suspended'
- Verify role exists in `user_roles` table
- Check RLS policies allow user to read their own profile

### Wrong Permissions
- Verify role in `user_roles` table matches expected role
- Check RLS policies for the specific table
- Verify `has_role()` function returns correct result
- Check if user status affects permissions (pending vs active)

---

## Related Documentation
- [User Journey Tests](./USER_JOURNEY_TESTS.md)
- [RLS Policies](./supabase/migrations/)
- [Edge Functions](https://supabase.com/dashboard/project/bfxhruvkzidvznsyyryp/functions)
