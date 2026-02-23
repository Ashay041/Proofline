-- =============================================================================
-- TEST LOGINS (use two browser windows to test PM vs Vendor)
-- =============================================================================
--
-- STEP 1 – Create these two users in Supabase Dashboard first:
--   Authentication → Users → Add user (do it twice)
--
--   User 1:  Email: pm@test.com      Password: password
--   User 2:  Email: vendor@test.com  Password: password
--
-- STEP 2 – Run this entire script in SQL Editor.
--
-- STEP 3 – Log in to your app:
--   PM:     pm@test.com     / password
--   Vendor: vendor@test.com / password
-- =============================================================================

DO $$
DECLARE
  v_pm_id uuid;
  v_vendor_id uuid;
  v_vendor_row_id uuid;
  v_prop_id uuid;
  v_unit_id uuid;
BEGIN
  -- Resolve user ids from auth (users must exist from Step 1)
  SELECT id INTO v_pm_id    FROM auth.users WHERE email = 'pm@test.com' LIMIT 1;
  SELECT id INTO v_vendor_id FROM auth.users WHERE email = 'vendor@test.com' LIMIT 1;

  IF v_pm_id IS NULL THEN
    RAISE EXCEPTION 'Create user pm@test.com in Dashboard (Auth → Add user) first, then re-run.';
  END IF;
  IF v_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Create user vendor@test.com in Dashboard (Auth → Add user) first, then re-run.';
  END IF;

  -- Profiles (id = auth user id)
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (v_pm_id, 'Test PM', 'pm@test.com')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (v_vendor_id, 'Test Vendor', 'vendor@test.com')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

  -- Roles
  INSERT INTO public.user_roles (user_id, role) VALUES (v_pm_id, 'pm'::app_role)    ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_vendor_id, 'vendor'::app_role) ON CONFLICT (user_id, role) DO NOTHING;

  -- Vendor row (so PM can assign tasks to this vendor; vendor sees tasks when logged in)
  SELECT id INTO v_vendor_row_id FROM public.vendors WHERE profile_id = v_vendor_id AND pm_id = v_pm_id LIMIT 1;
  IF v_vendor_row_id IS NULL THEN
    INSERT INTO public.vendors (pm_id, name, email, phone, specialty, profile_id)
    VALUES (v_pm_id, 'Test Vendor', 'vendor@test.com', '+1 555-111-1111', 'Cleaning', v_vendor_id)
    RETURNING id INTO v_vendor_row_id;
  END IF;

  -- One property + unit for PM (if missing)
  SELECT id INTO v_prop_id FROM public.properties WHERE pm_id = v_pm_id LIMIT 1;
  IF v_prop_id IS NULL THEN
    INSERT INTO public.properties (pm_id, name, address) VALUES (v_pm_id, 'Test Property', '123 Test St') RETURNING id INTO v_prop_id;
  END IF;
  SELECT id INTO v_unit_id FROM public.units WHERE property_id = v_prop_id LIMIT 1;
  IF v_unit_id IS NULL THEN
    INSERT INTO public.units (property_id, unit_number) VALUES (v_prop_id, '101') RETURNING id INTO v_unit_id;
  END IF;

  -- One task assigned to the vendor (so vendor has something to do)
  IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE vendor_id = v_vendor_row_id LIMIT 1) THEN
    INSERT INTO public.tasks (unit_id, vendor_id, pm_id, name, description, status, priority, estimated_duration, due_date, checklist, specifications)
    VALUES (
      v_unit_id, v_vendor_row_id, v_pm_id,
      'Sample turnover task',
      'Task assigned to Test Vendor. Log in as vendor@test.com to see it.',
      'not_started', 'medium', '1 hour', (CURRENT_DATE + 7),
      '[{"id":"c1","label":"Clean floors","checked":false},{"id":"c2","label":"Wipe surfaces","checked":false}]'::jsonb,
      '[]'::jsonb
    );
  END IF;
END $$;
