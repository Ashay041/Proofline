-- Vendors table: PM-created vendor contacts (persisted). Tasks reference vendors(id).
-- When a vendor user signs up, link them by setting vendors.profile_id = auth.uid().

CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pm_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  specialty text NOT NULL DEFAULT 'Cleaning',
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PMs can CRUD own vendors"
  ON public.vendors FOR ALL
  TO authenticated
  USING (pm_id = auth.uid())
  WITH CHECK (pm_id = auth.uid());

-- Vendor users see vendor rows linked to their profile (for task assignment display)
CREATE POLICY "Vendors can read own vendor row"
  ON public.vendors FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Migrate existing tasks: vendor_id currently points to profiles. Create one vendor row per distinct vendor_id.
INSERT INTO public.vendors (id, pm_id, name, email, phone, specialty, profile_id)
SELECT t.vendor_id, t.pm_id, COALESCE(p.full_name, 'Vendor'), p.email, p.phone, COALESCE(p.specialty, 'Cleaning'), t.vendor_id
FROM (
  SELECT DISTINCT ON (vendor_id) vendor_id, pm_id FROM public.tasks ORDER BY vendor_id, pm_id
) t
JOIN public.profiles p ON p.id = t.vendor_id
ON CONFLICT (id) DO NOTHING;

-- Change tasks.vendor_id to reference vendors(id) instead of profiles(id)
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_vendor_id_fkey;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE RESTRICT;

-- Update task RLS: vendor sees tasks where the task's vendor row has profile_id = auth.uid()
DROP POLICY IF EXISTS "Vendors can view assigned tasks" ON public.tasks;
CREATE POLICY "Vendors can view assigned tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.id = tasks.vendor_id AND v.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Vendors can update assigned tasks" ON public.tasks;
CREATE POLICY "Vendors can update assigned tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = tasks.vendor_id AND v.profile_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = tasks.vendor_id AND v.profile_id = auth.uid())
  );

-- task_submissions: vendor access by task's vendor profile_id
DROP POLICY IF EXISTS "Vendors can view own submissions" ON public.task_submissions;
CREATE POLICY "Vendors can view own submissions"
  ON public.task_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.vendors v ON v.id = t.vendor_id AND v.profile_id = auth.uid()
      WHERE t.id = task_submissions.task_id
    )
  );

DROP POLICY IF EXISTS "Vendors can insert submissions" ON public.task_submissions;
CREATE POLICY "Vendors can insert submissions"
  ON public.task_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.vendors v ON v.id = t.vendor_id AND v.profile_id = auth.uid()
      WHERE t.id = task_submissions.task_id
    )
  );

-- reported_issues: vendor access
DROP POLICY IF EXISTS "Vendors can view issues on assigned tasks" ON public.reported_issues;
CREATE POLICY "Vendors can view issues on assigned tasks"
  ON public.reported_issues FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.vendors v ON v.id = t.vendor_id AND v.profile_id = auth.uid()
      WHERE t.id = reported_issues.task_id
    )
  );

DROP POLICY IF EXISTS "Vendors can insert issues on assigned tasks" ON public.reported_issues;
CREATE POLICY "Vendors can insert issues on assigned tasks"
  ON public.reported_issues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.vendors v ON v.id = t.vendor_id AND v.profile_id = auth.uid()
      WHERE t.id = reported_issues.task_id
    )
  );
