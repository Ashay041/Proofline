-- Vendor linking by email: case-sensitive; trim whitespace so " a@b.com " matches "a@b.com".
-- Optional arg: when auth.users is not readable (e.g. some hosted setups), pass current user email from client.
CREATE OR REPLACE FUNCTION public.link_vendor_profile_by_email(p_user_email text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_email text;
  match_email text;
BEGIN
  auth_email := (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1);
  match_email := COALESCE(NULLIF(TRIM(p_user_email), ''), auth_email);
  IF match_email IS NULL THEN RETURN; END IF;
  /* When client sends email, verify it matches auth; never trust client when auth email is unknown */
  IF p_user_email IS NOT NULL AND auth_email IS NULL THEN RETURN; END IF;
  IF p_user_email IS NOT NULL AND TRIM(p_user_email) <> TRIM(auth_email) THEN RETURN; END IF;
  UPDATE public.vendors
  SET profile_id = auth.uid()
  WHERE profile_id IS NULL
    AND TRIM(COALESCE(email, '')) = TRIM(match_email);
END;
$$;

-- On signup: link vendor row when email matches exactly (case-sensitive)
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
  UPDATE public.vendors
  SET profile_id = NEW.id
  WHERE profile_id IS NULL
    AND TRIM(COALESCE(email, '')) = TRIM(COALESCE(NEW.email, ''));
  RETURN NEW;
END;
$$;
