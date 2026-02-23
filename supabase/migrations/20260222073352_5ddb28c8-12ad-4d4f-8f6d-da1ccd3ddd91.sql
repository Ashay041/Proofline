
-- 1. Enums
CREATE TYPE public.app_role AS ENUM ('pm', 'vendor');
CREATE TYPE public.task_status AS ENUM ('not_started', 'in_progress', 'completed', 'approved', 'rework');
CREATE TYPE public.task_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE public.issue_status AS ENUM ('reported', 'resolved');

-- 2. user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role() security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS for user_roles: users can read their own roles
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3. profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  specialty text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "PMs can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'pm'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Trigger to auto-create profile on signup
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
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. properties table
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pm_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PMs can CRUD own properties"
  ON public.properties FOR ALL
  TO authenticated
  USING (pm_id = auth.uid())
  WITH CHECK (pm_id = auth.uid());

-- 5. units table
CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  unit_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PMs can CRUD units of own properties"
  ON public.units FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = units.property_id
        AND properties.pm_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = units.property_id
        AND properties.pm_id = auth.uid()
    )
  );

-- 6. tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  pm_id uuid REFERENCES public.profiles(id) NOT NULL,
  vendor_id uuid REFERENCES public.profiles(id) NOT NULL,
  name text NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'not_started',
  priority task_priority NOT NULL DEFAULT 'medium',
  estimated_duration text,
  due_date date,
  checklist jsonb DEFAULT '[]'::jsonb,
  specifications jsonb DEFAULT '[]'::jsonb,
  photos text[] DEFAULT '{}',
  rework_note text,
  rework_items jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- PM: full CRUD on own tasks
CREATE POLICY "PMs can CRUD own tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (pm_id = auth.uid())
  WITH CHECK (pm_id = auth.uid());

-- Vendor: SELECT tasks assigned to them
CREATE POLICY "Vendors can view assigned tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (vendor_id = auth.uid());

-- Vendor: UPDATE tasks assigned to them (status, checklist, photos)
CREATE POLICY "Vendors can update assigned tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (vendor_id = auth.uid())
  WITH CHECK (vendor_id = auth.uid());

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. task_submissions table
CREATE TABLE public.task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  checklist_snapshot jsonb,
  photos text[] DEFAULT '{}',
  rework_items jsonb,
  rework_note text,
  geo_lat double precision,
  geo_lng double precision,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PMs can view submissions for own tasks"
  ON public.task_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_submissions.task_id
        AND tasks.pm_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can view own submissions"
  ON public.task_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_submissions.task_id
        AND tasks.vendor_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can insert submissions"
  ON public.task_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_submissions.task_id
        AND tasks.vendor_id = auth.uid()
    )
  );

-- 8. reported_issues table
CREATE TABLE public.reported_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  photo_url text,
  status issue_status NOT NULL DEFAULT 'reported',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reported_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PMs can manage issues on own tasks"
  ON public.reported_issues FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = reported_issues.task_id
        AND tasks.pm_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = reported_issues.task_id
        AND tasks.pm_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can view issues on assigned tasks"
  ON public.reported_issues FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = reported_issues.task_id
        AND tasks.vendor_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can insert issues on assigned tasks"
  ON public.reported_issues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = reported_issues.task_id
        AND tasks.vendor_id = auth.uid()
    )
  );
