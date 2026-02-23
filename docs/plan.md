

# V2: Supabase Backend, Auth, and Geo-Location (Updated)

## Changes from Previous Plan

1. **`issue_status` enum** now includes `resolved` in addition to `reported`
2. **Multi-PM / multi-vendor** explicitly clarified throughout -- the system supports any number of PMs and any number of vendors, each with fully isolated views of their own data

---

## Entity Relationships

```text
profiles (all users -- many PMs, many vendors)
  |
  +-- user_roles (pm / vendor)

Each PM owns:
  properties --1:N--> units --1:N--> tasks
                                       |
                                       +--> task_submissions (with geo)
                                       +--> reported_issues

Task: created by one PM (pm_id), assigned to one vendor (vendor_id)
Vendor: shared across PMs -- can receive tasks from many different PMs
PM isolation: PM-A cannot see PM-B's properties, units, or tasks
Vendor view: sees all tasks assigned to them, regardless of which PM created them
```

---

## Database Schema

### 1. Enums

```sql
CREATE TYPE public.app_role AS ENUM ('pm', 'vendor');
CREATE TYPE public.task_status AS ENUM ('not_started', 'in_progress', 'completed', 'approved', 'rework');
CREATE TYPE public.task_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE public.issue_status AS ENUM ('reported', 'resolved');
```

### 2. `user_roles` table + `has_role()` function

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| user_id | uuid FK auth.users | ON DELETE CASCADE, NOT NULL |
| role | app_role | NOT NULL |

Unique constraint on (user_id, role). Security definer function `has_role(user_id, role)` to avoid RLS recursion.

### 3. `profiles` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | FK to auth.users, ON DELETE CASCADE |
| full_name | text | NOT NULL |
| email | text | |
| phone | text | |
| specialty | text | For vendors (e.g., "Cleaning") |
| created_at | timestamptz | DEFAULT now() |

Auto-created on signup via database trigger. RLS: users read/update own profile; PMs can read all profiles (to see vendor info).

### 4. `properties` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| pm_id | uuid FK profiles | NOT NULL |
| name | text | NOT NULL |
| address | text | |
| created_at | timestamptz | DEFAULT now() |

RLS: PM sees only `pm_id = auth.uid()`. Vendors have no direct access.

### 5. `units` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| property_id | uuid FK properties | NOT NULL |
| unit_number | text | NOT NULL |
| created_at | timestamptz | DEFAULT now() |

RLS: PM sees units of their own properties (join). Vendors: no direct access.

### 6. `tasks` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| unit_id | uuid FK units | NOT NULL |
| pm_id | uuid FK profiles | NOT NULL |
| vendor_id | uuid FK profiles | NOT NULL |
| name | text | NOT NULL |
| description | text | |
| status | task_status | DEFAULT 'not_started' |
| priority | task_priority | DEFAULT 'medium' |
| estimated_duration | text | |
| due_date | date | |
| checklist | jsonb | Array of {id, label, checked} |
| specifications | jsonb | Array of strings |
| photos | text[] | |
| rework_note | text | |
| rework_items | jsonb | Array of {checklistItemId, note} |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

RLS:
- PM: full CRUD where `pm_id = auth.uid()`
- Vendor: SELECT + UPDATE (checklist, photos, status) where `vendor_id = auth.uid()`

### 7. `task_submissions` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| task_id | uuid FK tasks | NOT NULL |
| checklist_snapshot | jsonb | |
| photos | text[] | |
| rework_items | jsonb | |
| rework_note | text | |
| geo_lat | double precision | |
| geo_lng | double precision | |
| submitted_at | timestamptz | DEFAULT now() |

RLS: PM sees submissions for their tasks; vendor sees submissions for tasks assigned to them.

### 8. `reported_issues` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| task_id | uuid FK tasks | NOT NULL |
| title | text | NOT NULL |
| description | text | |
| photo_url | text | |
| status | issue_status | DEFAULT 'reported' |
| resolved_at | timestamptz | NULL -- set when status changes to 'resolved' |
| created_at | timestamptz | DEFAULT now() |

RLS: scoped via task ownership (PM sees issues on their tasks, vendor sees issues on their assigned tasks). PM can update status to 'resolved'.

---

## Authentication

- **Login page** (`/login`) -- email + password
- **Signup page** (`/signup`) -- email, password, full name, role selection (PM or Vendor), optional phone/specialty for vendors
- **Forgot password** + `/reset-password` page
- On signup: trigger creates profile, then role inserted into `user_roles`
- Protected routes redirect unauthenticated users to `/login`
- After login: check role via `has_role()`, redirect PM to `/pm`, vendor to `/vendor`
- Remove current Home page role selector
- Supports unlimited PMs and vendors signing up independently

---

## Geo-Location on Submit

When vendor taps "Mark Task Complete":
1. Browser calls `navigator.geolocation.getCurrentPosition()`
2. If denied: toast "Location access is required to submit" -- blocks submission
3. If granted: lat/lng stored in `task_submissions` row
4. PM review dialog shows the submitted coordinates

---

## Key Isolation Rules

- **PM-A cannot see PM-B's data** -- all queries scoped by `pm_id = auth.uid()`
- **Vendor sees tasks from all PMs** who assigned work to them -- scoped by `vendor_id = auth.uid()`
- **A vendor is a shared user** -- PM-A and PM-B can both assign tasks to the same vendor independently, neither sees the other's tasks
- **Issue resolution** -- PM can mark a reported issue as 'resolved', setting the `resolved_at` timestamp

---

## Migration Order

1. Enum types (app_role, task_status, task_priority, issue_status with 'reported' + 'resolved')
2. user_roles table + has_role() function
3. profiles table + auto-create trigger
4. properties table + RLS
5. units table + RLS
6. tasks table + RLS
7. task_submissions table + RLS
8. reported_issues table + RLS (including resolved_at column)
9. Seed data (via insert tool)

---

## Files Changed / Created

| File | Action |
|------|--------|
| Supabase migrations (8 migrations) | Created |
| `src/pages/Login.tsx` | New |
| `src/pages/Signup.tsx` | New |
| `src/pages/ResetPassword.tsx` | New |
| `src/hooks/useAuth.ts` | New -- session + role |
| `src/components/ProtectedRoute.tsx` | New |
| `src/context/TaskContext.tsx` | Rewrite -- Supabase queries replace localStorage |
| `src/pages/Home.tsx` | Redirect based on auth/role |
| `src/pages/TaskDetail.tsx` | Add geolocation on submit |
| `src/components/PMTaskReviewDialog.tsx` | Show geo coordinates + resolved issues |
| `src/App.tsx` | Auth routes + protected wrappers |
| `src/data/mockData.ts` | Kept for reference, no longer imported |
