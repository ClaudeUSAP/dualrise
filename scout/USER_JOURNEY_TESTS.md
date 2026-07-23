# User Journey Test Documentation

## Test Execution Status
**Last Updated**: 2025-11-16  
**Tested By**: _[Name]_  
**Environment**: _[Development/Staging/Production]_

---

## Legend
- ✅ **PASS** - Feature works as expected
- ❌ **FAIL** - Feature does not work or has critical issues
- ⚠️ **PARTIAL** - Feature works but has minor issues or limitations
- ⏳ **PENDING** - Not yet tested
- 🔍 **NEEDS VERIFICATION** - Requires deeper investigation

---

## 🔴 ADMIN ROLE - User Journey Tests

### A1: User Management

#### A1.1 - View All Users
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Navigate to User Management | See list of all users (admin, agent, coach) | | ⏳ | |
| Filter by role (Admin) | Only admin users shown | | ⏳ | |
| Filter by role (Agent) | Only agent users shown | | ⏳ | |
| Filter by role (Coach) | Only coach users shown | | ⏳ | |
| Filter by status (Active) | Only active users shown | | ⏳ | |
| Filter by status (Pending) | Only pending users shown | | ⏳ | |
| Search by email | Correct user(s) displayed | | ⏳ | |
| Search by name | Correct user(s) displayed | | ⏳ | |

**RLS Policy Check**: "Admins can view all profiles"
```sql
-- Verify policy exists
SELECT * FROM pg_policies WHERE tablename = 'users' AND policyname LIKE '%Admin%view%';
```

#### A1.2 - Create Admin User
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Click "Add New Admin" | Modal opens | | ⏳ | |
| Fill form with valid admin data | Form accepts input | | ⏳ | |
| Submit form | User created successfully | | ⏳ | |
| Check database | User in `users` table | | ⏳ | |
| Check database | User in `auth.users` table | | ⏳ | |
| Check database | Role in `user_roles` table = 'admin' | | ⏳ | |
| Check email | Welcome email received | | ⏳ | |
| Check email | Password included in email | | ⏳ | |
| Login as new admin | Login successful | | ⏳ | |
| Check permissions | Has admin access | | ⏳ | |

**Edge Function**: `create-admin-user`  
**Logs**: [Check Logs](https://supabase.com/dashboard/project/bfxhruvkzidvznsyyryp/functions/create-admin-user/logs)

#### A1.3 - Create Agent User
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Click "Add New Agent" | Modal opens | | ⏳ | |
| Fill form with valid agent data | Form accepts input | | ⏳ | |
| Submit form | User created successfully | | ⏳ | |
| Check database | User in `users` table | | ⏳ | |
| Check database | User in `auth.users` table | | ⏳ | |
| Check database | Role in `user_roles` table = 'agent' | | ⏳ | |
| Check email | Welcome email received | | ⏳ | |
| Login as new agent | Login successful | | ⏳ | |
| Check permissions | Has agent access | | ⏳ | |

#### A1.4 - Edit User Profile
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Click edit on coach user | Edit modal opens | | ⏳ | |
| Change user name | Name updates successfully | | ⏳ | |
| Change user email | Email updates successfully | | ⏳ | |
| Change user phone | Phone updates successfully | | ⏳ | |
| Change user school | School updates successfully | | ⏳ | |
| Check database | Changes persisted | | ⏳ | |
| Edit admin user profile | Can edit successfully | | ⏳ | |
| Edit agent user profile | Can edit successfully | | ⏳ | |

**RLS Policy Check**: "Admins can update all profiles" (PERMISSIVE)

#### A1.5 - Change User Status
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Change coach from pending to active | Status updates, coach can now access | | ⏳ | |
| Change coach from active to suspended | Status updates, coach loses access | | ⏳ | |
| Change admin status | Should work | | ⏳ | |
| Change agent status | Should work | | ⏳ | |
| Suspended user tries to login | Access denied or redirect | | ⏳ | |

#### A1.6 - Password Management
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Click "Send Password Reset" for user | Success message shown | | ⏳ | |
| Check user email | Password reset email received | | ⏳ | |
| Click reset link | Redirect to reset page | | ⏳ | |
| Enter new password | Password updated successfully | | ⏳ | |
| Login with new password | Login successful | | ⏳ | |

**Edge Function**: `send-password-reset-email`

#### A1.7 - Admin Notifications
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| New coach registers | Admin receives email notification | | ⏳ | |
| Check notification content | Contains coach details | | ⏳ | |
| Check notification content | Contains approval link | | ⏳ | |
| Click approval link | Redirects to correct page | | ⏳ | |

**Edge Function**: `notify-admins-new-coach`

---

### A2: Athlete Management

#### A2.1 - View Athletes
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Navigate to Athlete Management | See list of athletes | | ⏳ | |
| Search for athlete | Correct results shown | | ⏳ | |
| Filter by gender | Correct athletes shown | | ⏳ | |
| Filter by graduation year | Correct athletes shown | | ⏳ | |
| Filter by status | Correct athletes shown | | ⏳ | |

**RLS Policy**: "Admins and agents can view athletes"

#### A2.2 - Add New Athlete
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Navigate to "Add New Athlete" | Form displayed | | ⏳ | |
| Fill required fields only | Form validates | | ⏳ | |
| Submit form | Athlete created | | ⏳ | |
| Check database | Athlete in `athletes` table | | ⏳ | |
| Check athlete slug | Slug generated correctly | | ⏳ | |
| Upload profile photo | Image uploaded to storage | | ⏳ | |
| Add complete profile data | All fields save correctly | | ⏳ | |

**RLS Policy**: "Admins and agents can insert athletes"

#### A2.3 - Edit Athlete
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Click edit on athlete | Edit page opens | | ⏳ | |
| Change basic info (name, DOB) | Updates saved | | ⏳ | |
| Change academic info (GPA, SAT) | Updates saved | | ⏳ | |
| Change golf stats | Updates saved | | ⏳ | |
| Upload new profile photo | Image updated | | ⏳ | |
| Change status (new, available, committed) | Status updates | | ⏳ | |
| Add video links | Links saved correctly | | ⏳ | |

**RLS Policy**: "Admins and agents can update athletes"

#### A2.4 - Delete Athlete
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Click delete on athlete | Confirmation dialog shown | | ⏳ | |
| Confirm deletion | Athlete deleted | | ⏳ | |
| Check database | Athlete removed from `athletes` table | | ⏳ | |
| Check related data | Tournament results cascade deleted (or handled) | | ⏳ | |

**RLS Policy**: "Admins and agents can delete athletes"

---

### A3: Tournament Management

#### A3.1 - View Tournaments
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Navigate to Tournament Management | See list of tournaments | | ⏳ | |
| Search for tournament | Correct results shown | | ⏳ | |
| Filter by year | Correct tournaments shown | | ⏳ | |
| Filter by series | Correct tournaments shown | | ⏳ | |
| Filter by gender | Correct tournaments shown | | ⏳ | |

#### A3.2 - Add New Tournament
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Navigate to "Add New Tournament" | Form displayed | | ⏳ | |
| Fill required fields | Form validates | | ⏳ | |
| Submit form | Tournament created | | ⏳ | |
| Check database | Tournament in `tournaments` table | | ⏳ | |

**RLS Policy**: "Admins and agents can insert tournaments"

#### A3.3 - Edit Tournament
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Click edit on tournament | Edit page opens | | ⏳ | |
| Change tournament name | Updates saved | | ⏳ | |
| Change dates | Updates saved | | ⏳ | |
| Change course info (par, rating, slope) | Updates saved | | ⏳ | |
| Add results link | Link saved | | ⏳ | |

**RLS Policy**: "Admins and agents can update tournaments"

#### A3.4 - Manage Tournament Results
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Navigate to tournament results entry | Results form displayed | | ⏳ | |
| Add result for athlete | Result saved | | ⏳ | |
| Import results from CSV | Results imported successfully | | ⏳ | |
| Edit existing result | Updates saved | | ⏳ | |
| Delete result | Result removed | | ⏳ | |
| Check athlete metrics | Metrics recalculated correctly | | ⏳ | |

---

## 🟡 AGENT ROLE - User Journey Tests

### B1: Athlete Management

#### B1.1 - View Athletes (Agent)
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Login as agent | Login successful | | ⏳ | |
| Navigate to Athletes page | Can access page | | ⏳ | |
| See list of athletes | All athletes visible | | ⏳ | |
| Search and filter | Works correctly | | ⏳ | |

#### B1.2 - Add Athlete (Agent)
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Navigate to "Add New Athlete" | Can access page | | ⏳ | |
| Create new athlete | Athlete created successfully | | ⏳ | |
| Check database | Athlete saved correctly | | ⏳ | |

#### B1.3 - Edit Athlete (Agent)
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Edit any athlete | Can access edit page | | ⏳ | |
| Make changes | Changes saved | | ⏳ | |

**Cannot Delete**: Agents should NOT be able to delete athletes (verify this)

---

### B2: Tournament Management

#### B2.1 - View Tournaments (Agent)
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Navigate to Tournaments | Can access page | | ⏳ | |
| See all tournaments | All tournaments visible | | ⏳ | |

#### B2.2 - Add Tournament (Agent)
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Navigate to "Add New Tournament" | Can access page | | ⏳ | |
| Create new tournament | Tournament created | | ⏳ | |

#### B2.3 - Edit Tournament (Agent)
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Edit any tournament | Can access edit page | | ⏳ | |
| Make changes | Changes saved | | ⏳ | |

---

### B3: Profile Management

#### B3.1 - Edit Own Profile
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Navigate to Settings/Profile | Can access page | | ⏳ | |
| Change name | Updates saved | | ⏳ | |
| Change email | Updates saved | | ⏳ | |
| Change phone | Updates saved | | ⏳ | |

**RLS Policy**: "Users can update own profile"

#### B3.2 - Change Password
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Navigate to password change | Form displayed | | ⏳ | |
| Enter current password | Validates correctly | | ⏳ | |
| Enter new password | Password updated | | ⏳ | |
| Login with new password | Login successful | | ⏳ | |

---

### B4: Access Restrictions (Agent)

#### B4.1 - Cannot Access Admin Features
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Try to access User Management | Blocked or redirected | | ⏳ | |
| Try to access Admin Dashboard | Blocked or redirected | | ⏳ | |
| Try to access System Settings | Blocked or redirected | | ⏳ | |
| Try to create admin users | Should not see option | | ⏳ | |
| Try to change user roles | Should not see option | | ⏳ | |

---

## 🟢 COACH ROLE - User Journey Tests

### C1: Registration Flow

#### C1.1 - New Coach Registration
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Navigate to /register | Registration form displayed | | ⏳ | |
| Fill all required fields | Form validates | | ⏳ | |
| Submit registration | Success message shown | | ⏳ | |
| Check database | User in `users` table | | ⏳ | |
| Check database | User in `auth.users` table | | ⏳ | |
| Check database | Role in `user_roles` = 'coach' | | ⏳ | |
| Check database | Status = 'pending' | | ⏳ | |
| Check email (coach) | Welcome/confirmation email received | | ⏳ | |
| Check email (admin) | Admin notification received | | ⏳ | |
| Try to login immediately | Can login but limited access | | ⏳ | |

**Edge Function**: `notify-admins-new-coach`

#### C1.2 - Email Confirmation (if enabled)
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Check inbox | Confirmation email received | | ⏳ | |
| Click confirmation link | Email verified | | ⏳ | |
| Login after confirmation | Login successful | | ⏳ | |

---

### C2: Pending Coach Access

#### C2.1 - Limited Access While Pending
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Login as pending coach | Login successful | | ⏳ | |
| Navigate to Athletes page | Blocked or see "pending approval" message | | ⏳ | |
| Navigate to Dashboard | Shows pending status | | ⏳ | |
| Try to browse athletes | Should be restricted | | ⏳ | |
| Try to view athlete details | Should be restricted | | ⏳ | |
| Try to submit contact request | Should be restricted | | ⏳ | |

**RLS Policy**: "Active coaches, admins and agents can view athletes" (should block pending)

---

### C3: Active Coach Access

#### C3.1 - Browse Athletes
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Login as active coach | Login successful | | ⏳ | |
| Navigate to Athletes page | Can access | | ⏳ | |
| See list of athletes | Athletes displayed | | ⏳ | |
| Use search filters | Filters work correctly | | ⏳ | |
| Filter by graduation year | Correct results | | ⏳ | |
| Filter by GPA | Correct results | | ⏳ | |
| Filter by scoring average | Correct results | | ⏳ | |
| Filter by gender | Correct results | | ⏳ | |
| Filter by country | Correct results | | ⏳ | |
| Sort by different criteria | Sorting works | | ⏳ | |

**Page**: `/athletes`

#### C3.2 - View Athlete Profile
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Click on athlete | Detail page opens | | ⏳ | |
| View basic info | All info displayed | | ⏳ | |
| View academic info | GPA, test scores visible | | ⏳ | |
| View golf statistics | Stats displayed correctly | | ⏳ | |
| View tournament results | Results table shown | | ⏳ | |
| View photos/videos | Media displayed | | ⏳ | |
| View contact preferences | Preferences shown | | ⏳ | |

**Page**: `/athletes/:slug`

---

### C4: Contact Requests

#### C4.1 - Submit Contact Request
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| On athlete detail page, click "Request Contact" | Modal opens | | ⏳ | |
| Fill interest level | Required field validates | | ⏳ | |
| Fill message | Text area accepts input | | ⏳ | |
| Fill WhatsApp number (optional) | Number accepted | | ⏳ | |
| Submit request | Success message shown | | ⏳ | |
| Check database | Request in `contact_requests` table | | ⏳ | |
| Check request status | Status = 'pending' | | ⏳ | |
| Check coach_id | Matches current user | | ⏳ | |

**RLS Policy**: "Coaches can create contact requests"

#### C4.2 - View Own Contact Requests
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Navigate to "My Contact Requests" | Page displays | | ⏳ | |
| See list of requests | All own requests shown | | ⏳ | |
| See request status | Status displayed correctly | | ⏳ | |
| See athlete info | Athlete details shown | | ⏳ | |
| Filter by status | Filters work | | ⏳ | |
| Cannot see other coaches' requests | Only own requests visible | | ⏳ | |

**RLS Policy**: "Coaches can only see their own contact requests"  
**Page**: `/my-contact-requests`

---

### C5: Favorites

#### C5.1 - Add to Favorites
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| On athlete detail page | See "Add to Favorites" button | | ⏳ | |
| Click "Add to Favorites" | Success message shown | | ⏳ | |
| Check database | Favorite in `favorites` table | | ⏳ | |
| Button changes to "Remove from Favorites" | UI updates | | ⏳ | |

**RLS Policy**: "Coaches can create favorites"

#### C5.2 - View Favorites
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Navigate to Favorites page | Page displays | | ⏳ | |
| See list of favorited athletes | All favorites shown | | ⏳ | |
| Click on favorite | Opens athlete detail | | ⏳ | |
| Cannot see other coaches' favorites | Only own favorites visible | | ⏳ | |

**RLS Policy**: "Coaches can only see their own favorites"  
**Page**: `/favorites`

#### C5.3 - Remove from Favorites
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| On athlete detail page, click "Remove" | Confirmation dialog | | ⏳ | |
| Confirm removal | Success message | | ⏳ | |
| Check database | Favorite deleted | | ⏳ | |
| Button changes to "Add to Favorites" | UI updates | | ⏳ | |

---

### C6: Notes

#### C6.1 - Add Note to Athlete
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| On athlete detail page | See notes section | | ⏳ | |
| Click "Add Note" | Note form appears | | ⏳ | |
| Select category | Dropdown works | | ⏳ | |
| Enter note text | Text area accepts input | | ⏳ | |
| Save note | Success message shown | | ⏳ | |
| Check database | Note in `athlete_notes` table | | ⏳ | |
| Note displayed | Note appears in list | | ⏳ | |

**RLS Policy**: "Coaches can create notes"

#### C6.2 - View Own Notes
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| On athlete detail page | See own notes | | ⏳ | |
| Cannot see other coaches' notes | Only own notes visible | | ⏳ | |

**RLS Policy**: "Coaches can only see their own notes"

#### C6.3 - Edit/Delete Note
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Click edit on note | Edit form appears | | ⏳ | |
| Update note | Changes saved | | ⏳ | |
| Click delete on note | Confirmation dialog | | ⏳ | |
| Confirm delete | Note deleted | | ⏳ | |

---

### C7: Saved Searches

#### C7.1 - Save Search
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| On Athletes page with filters applied | See "Save Search" option | | ⏳ | |
| Click "Save Search" | Modal opens | | ⏳ | |
| Enter search name | Name accepted | | ⏳ | |
| Save search | Success message | | ⏳ | |
| Check database | Search in `saved_searches` table | | ⏳ | |

**RLS Policy**: "Coaches can create saved searches"

#### C7.2 - View Saved Searches
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Navigate to Saved Searches | Page displays | | ⏳ | |
| See list of saved searches | All own searches shown | | ⏳ | |
| Click on saved search | Applies filters and shows results | | ⏳ | |
| Cannot see other coaches' searches | Only own searches visible | | ⏳ | |

**Page**: `/saved-searches`

#### C7.3 - Search Alerts
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Enable alerts for saved search | Alert enabled | | ⏳ | |
| Set alert frequency | Frequency saved | | ⏳ | |
| New athlete matches search | Alert email sent | | ⏳ | |
| Check email | Email received with matches | | ⏳ | |

**Edge Function**: `run-saved-search-alerts`

---

### C8: Profile Features

#### C8.1 - Share Athlete Profile
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| On athlete detail page | See "Share" button | | ⏳ | |
| Click "Share" | Share modal opens | | ⏳ | |
| Copy link | Link copied to clipboard | | ⏳ | |
| Open link in new tab | Profile displays correctly | | ⏳ | |
| Share via email option | Email client opens | | ⏳ | |

#### C8.2 - Download Athlete Profile PDF
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| On athlete detail page | See "Download PDF" button | | ⏳ | |
| Click "Download PDF" | PDF generation starts | | ⏳ | |
| PDF downloads | File downloaded successfully | | ⏳ | |
| Open PDF | Contains all athlete info | | ⏳ | |
| Check formatting | PDF formatted correctly | | ⏳ | |

---

### C9: Own Profile Management

#### C9.1 - View/Edit Profile
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Navigate to Settings | Settings page displays | | ⏳ | |
| View profile info | All info displayed | | ⏳ | |
| Edit name | Updates saved | | ⏳ | |
| Edit school | Updates saved | | ⏳ | |
| Edit position | Updates saved | | ⏳ | |
| Edit phone | Updates saved | | ⏳ | |
| Edit recruiting needs | Updates saved | | ⏳ | |

**Page**: `/settings`

#### C9.2 - Change Password
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Navigate to password change | Form displayed | | ⏳ | |
| Enter current password | Validates | | ⏳ | |
| Enter new password | Accepts input | | ⏳ | |
| Submit | Password changed | | ⏳ | |
| Logout and login with new password | Login successful | | ⏳ | |

---

### C10: Access Restrictions (Coach)

#### C10.1 - Cannot Access Admin Features
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Try to access /admin | Redirected to /dashboard | | ⏳ | |
| Try to access User Management | Blocked | | ⏳ | |
| Try to create/edit/delete athletes | No UI for this | | ⏳ | |
| Try to create/edit/delete tournaments | No UI for this | | ⏳ | |

#### C10.2 - Cannot Access Agent Features
| Test Case | Expected Result | Actual Result | Status | Notes |
|-----------|----------------|---------------|---------|-------|
| Try to access athlete management | Blocked | | ⏳ | |
| Try to access tournament management | Blocked | | ⏳ | |

---

## 📊 Summary Statistics

### Test Completion
- **Total Test Cases**: _[Count]_
- **Passed**: _[Count]_ (✅)
- **Failed**: _[Count]_ (❌)
- **Partial**: _[Count]_ (⚠️)
- **Pending**: _[Count]_ (⏳)
- **Pass Rate**: _%_

### Critical Issues Found
1. _[Issue 1]_
2. _[Issue 2]_
3. _[Issue 3]_

### Blocker Issues (Must Fix)
1. _[Blocker 1]_
2. _[Blocker 2]_

---

## 🔧 Issues Log

### Issue #1: [Issue Title]
- **Severity**: Critical / High / Medium / Low
- **Status**: Open / In Progress / Resolved
- **Test Case**: [Reference test case ID]
- **Description**: [Detailed description]
- **Steps to Reproduce**:
  1. Step 1
  2. Step 2
  3. Step 3
- **Expected Result**: [What should happen]
- **Actual Result**: [What actually happens]
- **Screenshots/Logs**: [Attach evidence]
- **Resolution**: [How it was fixed]

---

## 📝 Notes & Observations

### Performance Issues
- _[Note any slow-loading pages or features]_

### UX Issues
- _[Note any confusing UI or poor user experience]_

### Security Concerns
- _[Note any potential security issues]_

### Feature Requests
- _[Note any feature requests that came up during testing]_

---

## ✅ Sign-Off

**Tester Signature**: _______________  
**Date**: _______________  
**Approved By**: _______________  
**Date**: _______________
