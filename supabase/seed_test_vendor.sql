-- Seed: Test Vendor workflow (testvendor1@test.com with a task assigned)
--
-- Prerequisites:
-- 1. At least one PM user exists (sign up in the app as Property Manager, or use existing).
-- 2. Create the test vendor user:
--    - Option A: In Supabase Dashboard → Authentication → Users → "Add user"
--      Email: testvendor1@test.com, Password: password
--      Then in SQL run: INSERT INTO public.user_roles (user_id, role)
--        SELECT id, 'vendor'::app_role FROM auth.users WHERE email = 'testvendor1@test.com'
--        ON CONFLICT (user_id, role) DO NOTHING;
--      (Profile is created by trigger; ensure role is vendor.)
--    - Option B: Sign up in the app at /signup with Email: testvendor1@test.com,
--      Password: password, Role: Vendor. (Confirm email in Dashboard if required.)
--
-- Then run this entire script in SQL Editor.

DO $$
DECLARE
  v_vendor_user_id uuid;
  v_pm_id uuid;
  v_vendor_row_id uuid;
  v_prop_id uuid;
  v_unit_id uuid;
  v_task_id uuid;
BEGIN
  -- 1) Get test vendor: profile id or create from auth.users if user exists there
  SELECT id INTO v_vendor_user_id FROM public.profiles WHERE email = 'testvendor1@test.com' LIMIT 1;
  IF v_vendor_user_id IS NULL THEN
    -- User may have been created in Dashboard; ensure profile and role exist
    INSERT INTO public.profiles (id, full_name, email)
    SELECT id, 'Test Vendor 1', email FROM auth.users WHERE email = 'testvendor1@test.com' LIMIT 1
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'vendor'::app_role FROM auth.users WHERE email = 'testvendor1@test.com' LIMIT 1
    ON CONFLICT (user_id, role) DO NOTHING;
    SELECT id INTO v_vendor_user_id FROM public.profiles WHERE email = 'testvendor1@test.com' LIMIT 1;
  END IF;
  IF v_vendor_user_id IS NULL THEN
    RAISE NOTICE 'No user testvendor1@test.com. Create in Dashboard (Auth → Add user) or sign up at /signup, then re-run.';
    RETURN;
  END IF;

  -- 2) Get any PM (user_id from user_roles where role = pm)
  SELECT user_id INTO v_pm_id FROM public.user_roles WHERE role = 'pm' LIMIT 1;
  IF v_pm_id IS NULL THEN
    RAISE NOTICE 'No PM user found. Sign up as Property Manager first.';
    RETURN;
  END IF;

  -- 3) Ensure vendor row exists (vendors table)
  SELECT id INTO v_vendor_row_id FROM public.vendors WHERE profile_id = v_vendor_user_id LIMIT 1;
  IF v_vendor_row_id IS NULL THEN
    INSERT INTO public.vendors (pm_id, name, email, specialty, profile_id)
    VALUES (v_pm_id, 'Test Vendor 1', 'testvendor1@test.com', 'Cleaning', v_vendor_user_id)
    RETURNING id INTO v_vendor_row_id;
  END IF;

  -- 4) Ensure PM has at least one property
  SELECT id INTO v_prop_id FROM public.properties WHERE pm_id = v_pm_id LIMIT 1;
  IF v_prop_id IS NULL THEN
    INSERT INTO public.properties (pm_id, name, address)
    VALUES (v_pm_id, 'Seed Property', '123 Test St')
    RETURNING id INTO v_prop_id;
  END IF;

  -- 5) Ensure that property has at least one unit
  SELECT id INTO v_unit_id FROM public.units WHERE property_id = v_prop_id LIMIT 1;
  IF v_unit_id IS NULL THEN
    INSERT INTO public.units (property_id, unit_number)
    VALUES (v_prop_id, '101')
    RETURNING id INTO v_unit_id;
  END IF;

  -- 6) Create a task assigned to the test vendor (if none exists yet)
  IF NOT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE vendor_id = v_vendor_row_id
    LIMIT 1
  ) THEN
    INSERT INTO public.tasks (
      unit_id, vendor_id, pm_id, name, description, status, priority,
      estimated_duration, due_date, checklist, specifications
    )
    VALUES (
      v_unit_id,
      v_vendor_row_id,
      v_pm_id,
      'Turnover cleaning – Test',
      'Mock task for testing vendor workflow. Complete checklist and add photos.',
      'not_started',
      'medium',
      '1 hour',
      (CURRENT_DATE + 7),
      '[{"id":"c1","label":"Clean floors","checked":false},{"id":"c2","label":"Wipe surfaces","checked":false}]'::jsonb,
      '[]'::jsonb
    )
    RETURNING id INTO v_task_id;
    RAISE NOTICE 'Created task % for testvendor1@test.com. Log in as that vendor to see it.', v_task_id;
  ELSE
    RAISE NOTICE 'Test vendor already has a task assigned. Nothing to do.';
  END IF;
END $$;
