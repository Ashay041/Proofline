# Test login credentials

Use two browser windows (or normal + incognito) to test PM and Vendor flows.

## One-time setup

1. **Create two users in Supabase**  
   Dashboard → **Authentication** → **Users** → **Add user** (twice):

   | Email           | Password  |
   |-----------------|-----------|
   | `pm@test.com`     | `password` |
   | `vendor@test.com` | `password` |

2. **Run the seed**  
   Dashboard → **SQL Editor** → paste and run the contents of  
   `supabase/seed_pm_and_vendor_logins.sql`

## Logins

| Role   | Email           | Password  |
|--------|-----------------|-----------|
| **PM**    | `pm@test.com`     | `password` |
| **Vendor** | `vendor@test.com` | `password` |

- **PM window:** log in with PM → create/edit tasks, assign to Test Vendor, manage properties/units/vendors.
- **Vendor window:** log in with Vendor → you’ll see the sample task; complete it, add photos, etc.
