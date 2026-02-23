# Proofline

Proofline is a B2B SaaS web app for **unit turnover management** in multifamily property: **property managers (PMs)** create and assign tasks, **vendors** (cleaners, painters, etc.) complete work and submit proof. The app gives PMs visibility into progress and holds vendors accountable via **photo proof** and **geo-location at submit** (no QR codes: vendors log in, see all assigned tasks, and location is captured only when they mark a task complete).

This README gives enough context for an LLM or new developer to understand the codebase and build on it.

---

## 1. Product summary

- **Users:** Property managers (PMs) and vendors (field workers). Multi-tenant: many PMs, many vendors; each PM sees only their data; a vendor can have tasks from multiple PMs.
- **Vendors:** Log in → see a list of **all tasks assigned to them** (across units/PMs). They can open task details **before** going on-site to plan. On-site: checklist, specs, proof photos, “Ask AI,” report issues. On **Mark Task Complete**, the app requests **geolocation**; if denied, submit is blocked; if granted, lat/lng are stored with the submission. No QR codes.
- **PMs:** Dashboard, CRUD on tasks/vendors/units, review submissions (photos, checklist, **submitted geo**), approve or request rework. Unit-level view; when all tasks for a unit are approved, the unit is effectively “ready to occupy.”
- **Auth:** Email/password (Supabase Auth). Role stored in `user_roles` (pm | vendor). Signup, login, forgot/reset password. First screen is the **login screen** (root `/` shows login when not authenticated).

---

## 2. Tech stack

- **Frontend:** React 18, TypeScript, Vite, React Router, Tailwind CSS, shadcn/ui (Radix), TanStack Query, Sonner toasts. All frontend source and config live under `frontend/`.
- **Backend / data:** Supabase (Auth, Postgres, RLS, Storage). No custom Node server. Domain types, services, and Supabase client live under `backend/` and are consumed by the frontend via the `@backend/*` alias.
- **Tooling:** ESLint, Vitest (frontend tests), TypeScript (strictness relaxed in app code).

---

## 3. Project structure

```
Proofline-from-lovable/
├── frontend/                    # SPA and all frontend config
│   ├── index.html               # Entry HTML; script loads src/main.tsx
│   ├── public/                  # Static assets (favicon, robots.txt)
│   ├── src/
│   │   ├── main.tsx             # React root
│   │   ├── App.tsx              # Routes, providers
│   │   ├── index.css            # Global + Tailwind
│   │   ├── components/          # UI: shared + task-specific (e.g. PMTaskReviewDialog)
│   │   ├── pages/               # Route-level views (Home, Login, VendorDashboard, pm/*)
│   │   ├── context/             # TaskContext (Supabase-backed state + actions)
│   │   ├── hooks/               # useAuth, use-toast, use-mobile
│   │   └── test/
│   ├── vite.config.ts           # Vite; aliases @, @backend
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── vitest.config.ts
│   ├── tsconfig.app.json
│   └── components.json          # shadcn
├── backend/                     # Domain + data layer (no React)
│   ├── src/
│   │   ├── types/               # Task, Unit, Vendor, TaskSubmission, etc.
│   │   ├── services/            # taskService (pure domain logic)
│   │   ├── lib/                 # statusMapping, statusColor, supabaseStorage, utils
│   │   └── integrations/supabase/  # client.ts, types.ts (generated DB types)
│   └── README.md
├── supabase/                    # Migrations, config (Supabase CLI expects root)
│   ├── config.toml
│   └── migrations/
├── package.json                 # Scripts run from root; dev/build cd into frontend
├── tsconfig.json                # References frontend/tsconfig.app + tsconfig.node
├── tsconfig.node.json           # For frontend/vite.config.ts
├── eslint.config.js
├── run.sh                       # Install deps if needed, then npm run dev
├── .env                         # Optional env (Supabase keys currently in backend client)
└── dist/                        # Build output (from frontend build, outDir ../dist)
```

- **Path aliases:** In app code, `@/` → `frontend/src`, `@backend/*` → `backend/src/*`. Example: `import { Task } from "@backend/types"`, `import { useAuth } from "@/hooks/useAuth"`.
- **Scripts:** All run from **repo root**. `npm run dev` and `npm run build` do `cd frontend && vite` / `vite build` so the Vite/Tailwind context is `frontend/`.

---

## 4. How to run and build

- **Install:** From repo root, `npm install` (or `./run.sh` which installs if needed then starts dev).
- **Dev:** `./run.sh` or `npm run dev` → dev server (e.g. http://localhost:8080). First screen is login.
- **Build:** `npm run build` → writes to `dist/` at repo root.
- **Preview:** `npm run preview` → serve production build.
- **Test:** `npm run test` or `npm run test:watch` (Vitest in frontend).
- **Lint:** `npm run lint` (ESLint from root).

---

## 5. Auth and roles

- **Supabase Auth:** Email/password; session in client; `useAuth()` exposes `session`, `user`, `role`, `loading`, `signOut`.
- **Simple signup (no email verification):** For **hosted Supabase**, turn off "Confirm email" in Dashboard → Authentication → Providers → Email. For **local** Supabase, `supabase/config.toml` sets `auth.email.enable_confirmations = false`. Then signup creates the account and (when confirmation is off) the user can sign in immediately.
- **Role:** Stored in `user_roles` (table: `user_id`, `role`). Set at signup via trigger from `raw_user_meta_data.role`. Type: `AppRole = "pm" | "vendor"`.
- **ProtectedRoute:** Wraps vendor/PM routes. No session → redirect to `/`. Wrong role (e.g. vendor on `/pm`) → redirect to `/vendor` (or PM to `/pm`).
- **Profiles:** Row in `profiles` created on signup (trigger); `full_name`, `email`, `phone`, `specialty` (vendors). RLS: users read/update own; PMs can read all (for vendor list).

---

## 6. Routes and flows

| Path | Who | Description |
|------|-----|-------------|
| `/` | All | First screen: login when not authenticated; redirect to `/pm` or `/vendor` when logged in by role. |
| `/login` | All | Login form; if already logged in, redirect to role dashboard. |
| `/signup` | All | Sign up (email, password, role PM/vendor, name, optional phone/specialty). |
| `/forgot-password` | All | Request password reset email. |
| `/reset-password` | All | Set new password (recovery link). |
| `/vendor` | Vendor | Task list (all tasks assigned to this vendor). |
| `/unit/:unitId/task/:taskId` | Vendor (or PM) | Task detail: checklist, specs, photos, report issue, Mark Task Complete (with geo). |
| `/pm` | PM | Layout with sidebar; index = dashboard. |
| `/pm/tasks` | PM | Task list; create/edit/delete; open review dialog. |
| `/pm/vendors` | PM | Vendor list; CRUD (by profile). |
| `/pm/units` | PM | Unit list. |
| `/pm/units/:unitId` | PM | Unit detail + tasks. |
| `*` | All | NotFound. |

Vendor flow: Login → `/vendor` → click task → `/unit/:unitId/task/:taskId` → complete checklist, add photos → Mark Task Complete (geo requested) → submission stored with `geo_lat`/`geo_lng`. PM flow: Login → `/pm` → tasks/vendors/units → open task → review (photos, checklist, submission geo) → Approve or Request Rework.

---

## 7. Data model (domain + DB)

**Domain types** (`backend/src/types/index.ts`): `Task`, `Unit`, `Vendor`, `TaskSubmission`, `ReportedIssue`, `ChecklistItem`, `ReworkItem`; enums `TaskStatus`, `TaskPriority`. Task has `submissionHistory?: TaskSubmission[]`; `TaskSubmission` includes optional `geoLat`/`geoLng`.

**DB (Supabase):**

- **profiles** — id (→ auth.users), full_name, email, phone, specialty.
- **user_roles** — user_id, role (pm | vendor).
- **properties** — pm_id, name, address (PM-owned).
- **units** — property_id, unit_number.
- **tasks** — unit_id, pm_id, vendor_id, name, description, status, priority, estimated_duration, due_date, checklist (jsonb), specifications (jsonb), photos (text[]), rework_note, rework_items (jsonb).
- **task_submissions** — task_id, checklist_snapshot, photos, rework_items, rework_note, **geo_lat**, **geo_lng**, submitted_at.
- **reported_issues** — task_id, title, description, photo_url, status (reported | resolved), resolved_at.

**RLS:** PM sees only rows where `pm_id = auth.uid()` (or via their properties/units); vendor sees tasks where `vendor_id = auth.uid()` and related submissions/issues. One vendor can have tasks from many PMs; PMs do not see each other’s data.

---

## 8. Key files (where to change what)

- **Routes / shell:** `frontend/src/App.tsx` (all routes, providers).
- **First screen / login:** `frontend/src/pages/Home.tsx` (shows Login at `/` when not authenticated), `frontend/src/pages/Login.tsx`.
- **Auth:** `frontend/src/hooks/useAuth.ts` (session, role from Supabase); `frontend/src/components/ProtectedRoute.tsx` (guard by session + optional role).
- **Vendor UI:** `frontend/src/pages/VendorDashboard.tsx`, `frontend/src/pages/TaskDetail.tsx` (checklist, photos, geo on submit, report issue).
- **PM UI:** `frontend/src/pages/pm/PMLayout.tsx`, `frontend/src/pages/pm/PMTasks.tsx`, `frontend/src/pages/pm/PMVendors.tsx`, `frontend/src/pages/pm/PMUnits.tsx`, `frontend/src/pages/pm/PMUnitDetail.tsx`, `frontend/src/components/PMTaskReviewDialog.tsx` (approve/rework, shows submission geo).
- **State and server calls:** `frontend/src/context/TaskContext.tsx` — loads tasks/units/vendors from Supabase, exposes actions (toggleChecklistItem, addPhoto, addIssue, completeTask(geo), createTask, updateTask, deleteTask, requestRework, CRUD vendors, refresh). Uses `@backend` for types, statusMapping, Supabase client.
- **Domain logic:** `backend/src/services/taskService.ts` — pure functions: canComplete, getProgress, isTerminalStatus, rework helpers, etc. No React, no Supabase.
- **DB ↔ domain mapping:** `backend/src/lib/statusMapping.ts` (toDbStatus/fromDbStatus, toDbPriority/fromDbPriority).
- **Supabase client and types:** `backend/src/integrations/supabase/client.ts`, `backend/src/integrations/supabase/types.ts`. Photo upload: `backend/src/lib/supabaseStorage.ts` (task-photos bucket).
- **Schema / migrations:** `supabase/migrations/` (apply with Supabase CLI). High-level plan: `.lovable/plan.md`.

---

## 9. Supabase

- **Migrations** live in `supabase/migrations/`. Apply with `supabase db push` (or your workflow). Schema includes enums, tables, RLS, triggers (e.g. create profile + role on signup), and `has_role(user_id, role)`.
- **Client:** Single browser client in `backend/src/integrations/supabase/client.ts` (URL and anon key currently in code; for production, use env vars and inject at build time).
- **Storage:** Bucket `task-photos`; `uploadTaskPhoto(taskId, file)` in `backend/src/lib/supabaseStorage.ts` returns public URL.

---

## 10. Database migrations (Supabase)

The project ref is in `.env` as `VITE_SUPABASE_PROJECT_ID` (e.g. `jphhjpozlcnfpywynvys`). The Supabase CLI needs the project to be **linked** before `supabase db push` works.

**Connect Supabase (one-time, so the assistant or you can run migrations):**

1. Install the CLI if needed: `npm install -g supabase` or `brew install supabase/tap/supabase`.
2. From the project root, link (you’ll be prompted for your **database password** — get it from [Dashboard → Project Settings → Database](https://supabase.com/dashboard/project/jphhjpozlcnfpywynvys/settings/database)):
   ```bash
   supabase link --project-ref jphhjpozlcnfpywynvys
   ```
   Or: `supabase link --project-ref $VITE_SUPABASE_PROJECT_ID` (with `.env` loaded).
3. After linking, migrations can be applied with:
   ```bash
   supabase db push
   ```
   Or run: `./scripts/supabase-push.sh`

**Option B – No CLI (run SQL in Dashboard):**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Run the contents of each migration file in order (oldest first), e.g.:
   - `supabase/migrations/20260222120000_fix_properties_policy_recursion.sql`
   - `supabase/migrations/20260222130000_add_vendors_table.sql`

**Note:** The database password is not (and should not be) in `.env`; it’s only in Dashboard or entered when you run `supabase link`.

### Test vendor (testvendor1 / password)

To try the vendor flow with a pre-assigned task:

1. **Create the test user** (either):
   - **Dashboard:** Authentication → Users → “Add user” → Email: `testvendor1@test.com`, Password: `password`.
   - **App:** Go to `/signup`, sign up with Email: `testvendor1@test.com`, Password: `password`, Role: **Vendor** (confirm email in Dashboard if required).
2. Ensure at least one **PM** user exists (sign up as Property Manager if needed).
3. In Supabase **SQL Editor**, run the contents of `supabase/seed_test_vendor.sql`. It will create a vendor record, a property/unit for the PM if missing, and one task assigned to the test vendor.
4. Log in at `/` with **testvendor1@test.com** / **password** and open the vendor dashboard to see the assigned task.

---

## 11. Conventions and extending the app

- **New domain types or enums:** Add in `backend/src/types/index.ts`; use from frontend via `@backend/types`.
- **New task/domain rules:** Add in `backend/src/services/taskService.ts`; keep it pure (no Supabase/React).
- **New API/DB usage:** In `frontend/src/context/TaskContext.tsx` (or a new context) using `supabase` from `@backend/integrations/supabase/client`. Map DB rows to domain types (see existing `fromDbStatus`, `parseChecklist`, etc.).
- **New pages/routes:** Add in `frontend/src/App.tsx`; wrap with `ProtectedRoute` and `allowedRole` if needed. Use `useTaskState()` / `useAuth()` as needed.
- **New UI components:** Under `frontend/src/components/`; use `@/` for frontend and `@backend/*` for types/services.
- **Styling:** Tailwind + shadcn; `backend/src/lib/statusColor.ts` for task status colors.
- **Geo:** Captured in `TaskDetail` on “Mark Task Complete” via `navigator.geolocation.getCurrentPosition`; passed to `completeTask(taskId, { geoLat, geoLng })` and stored in `task_submissions`. Shown in PM review and submission history.

Use this README plus the referenced files and `.lovable/plan.md` to get full context for feature work or refactors.
