-- Add rent roll data columns to units table
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS unit_type text,
  ADD COLUMN IF NOT EXISTS sq_ft integer,
  ADD COLUMN IF NOT EXISTS tenant_name text,
  ADD COLUMN IF NOT EXISTS lease_start date,
  ADD COLUMN IF NOT EXISTS lease_end date,
  ADD COLUMN IF NOT EXISTS lease_term_months integer,
  ADD COLUMN IF NOT EXISTS move_in_date date,
  ADD COLUMN IF NOT EXISTS security_deposit numeric,
  ADD COLUMN IF NOT EXISTS monthly_rent numeric,
  ADD COLUMN IF NOT EXISTS last_increase numeric,
  ADD COLUMN IF NOT EXISTS concession numeric,
  ADD COLUMN IF NOT EXISTS parking numeric,
  ADD COLUMN IF NOT EXISTS late_fee numeric,
  ADD COLUMN IF NOT EXISTS other_fee numeric,
  ADD COLUMN IF NOT EXISTS notes text;
