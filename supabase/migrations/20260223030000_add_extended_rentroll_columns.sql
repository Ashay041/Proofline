-- Extended rent roll columns from standard multifamily rent roll format
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS market_rent numeric,
  ADD COLUMN IF NOT EXISTS lease_status text,
  ADD COLUMN IF NOT EXISTS occupants integer,
  ADD COLUMN IF NOT EXISTS pet_rent numeric,
  ADD COLUMN IF NOT EXISTS arrears numeric,
  ADD COLUMN IF NOT EXISTS move_in_specials text,
  ADD COLUMN IF NOT EXISTS subsidized_rent numeric,
  ADD COLUMN IF NOT EXISTS last_paid_date date,
  ADD COLUMN IF NOT EXISTS utility_billbacks numeric,
  ADD COLUMN IF NOT EXISTS lease_break_fee numeric,
  ADD COLUMN IF NOT EXISTS annual_rent numeric;
