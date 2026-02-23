# Backend (data / domain layer)

This folder holds **backend** code: domain types, services, Supabase client, and shared lib utilities.

- **`src/types`** — Domain models (Task, Unit, Vendor, TaskSubmission, etc.). No UI; used by frontend and services.
- **`src/services`** — Pure business logic (e.g. `taskService`: status rules, checklist, rework).
- **`src/lib`** — Utilities: statusMapping (DB ↔ domain), statusColor, supabaseStorage (photo upload), utils (cn).
- **`src/integrations/supabase`** — Supabase client and generated DB types.

**Supabase migrations** remain at project root (`/supabase`) so the Supabase CLI and hosting work as expected.

Frontend imports this layer via the `@backend/*` path alias (e.g. `@backend/types`, `@backend/services/taskService`).
