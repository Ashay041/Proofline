/**
 * Supabase browser client singleton.
 * Interface Segregation: frontend and backend share this client for data access.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://jphhjpozlcnfpywynvys.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwaGhqcG96bGNuZnB5d3ludnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NjM2NjYsImV4cCI6MjA4NzIzOTY2Nn0.Vw42QSSDrcbRecbp6ZyaJu6rad9Q6JKVn22qzABJqhs";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
