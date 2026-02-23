#!/usr/bin/env bash
# Apply pending Supabase migrations. Requires the project to be linked first (see README).
set -e
cd "$(dirname "$0")/.."
if ! command -v supabase &>/dev/null; then
  echo "Supabase CLI not found. Install: npm install -g supabase   or   brew install supabase/tap/supabase"
  exit 1
fi
supabase db push
