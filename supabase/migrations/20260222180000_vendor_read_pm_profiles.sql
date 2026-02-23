-- Vendors need to read PM profile names for tasks assigned to them.
CREATE POLICY "Vendors can read PM profiles of assigned tasks"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.vendors v ON v.id = t.vendor_id AND v.profile_id = auth.uid()
      WHERE t.pm_id = profiles.id
    )
  );
