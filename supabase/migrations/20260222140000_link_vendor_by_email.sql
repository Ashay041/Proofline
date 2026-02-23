-- Link PM-created vendor rows to the logged-in vendor user by email.
-- When a PM adds a vendor (email X) and assigns tasks, the vendor row has profile_id = null.
-- When the vendor user logs in with email X, this function sets profile_id = auth.uid()
-- so RLS allows them to see their assigned tasks.

CREATE OR REPLACE FUNCTION public.link_vendor_profile_by_email()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.vendors
  SET profile_id = auth.uid()
  WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
    AND profile_id IS NULL;
$$;

-- On signup: link any vendor row with this email to the new user (so they see tasks immediately)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'role')::app_role
  );
  -- Link PM-created vendor rows with this email so the new vendor sees assigned tasks
  UPDATE public.vendors SET profile_id = NEW.id WHERE email = NEW.email AND profile_id IS NULL;
  RETURN NEW;
END;
$$;
