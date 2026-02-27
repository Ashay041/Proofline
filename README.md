# Proofline

Proofline is a B2B SaaS web app for **unit turnover management** in multifamily property: **property managers (PMs)** create and assign tasks, **vendors** (cleaners, painters, etc.) complete work and submit proof. The app gives PMs visibility into progress and holds vendors accountable via **photo proof** and **geo-location at submit** (no QR codes: vendors log in, see all assigned tasks, and location is captured only when they mark a task complete).

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

