# Frontend (UI layer)

This folder holds the **frontend** React app: entry HTML, static assets, config, and source.

- **`index.html`** — SPA entry; script loads `src/main.tsx`.
- **`public/`** — Static assets (favicon, robots.txt, etc.).
- **`src/components`** — UI components (shared + task-specific) and primitives.
- **`src/pages`** — Route-level views (Login, VendorDashboard, PM layout and children, etc.).
- **`src/context`** — React context (e.g. TaskContext: state and Supabase-backed actions).
- **`src/hooks`** — useAuth, use-toast, use-mobile.
- **`vite.config.ts`**, **`tailwind.config.ts`**, **`postcss.config.js`**, **`vitest.config.ts`**, **`tsconfig.app.json`**, **`components.json`** — Build, style, test, and TS config for the frontend app.

Run from **repo root**: `npm run dev`, `npm run build`, etc. (scripts `cd frontend` then run Vite/Vitest so cwd is frontend.) Imports use `@/` for frontend paths and `@backend/*` for types, services, and Supabase.
