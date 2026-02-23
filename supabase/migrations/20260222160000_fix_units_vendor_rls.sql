-- Fix units RLS for vendors: use vendors.profile_id instead of tasks.vendor_id = auth.uid()
-- (tasks.vendor_id now references vendors(id), not profiles(id))
DROP POLICY IF EXISTS "Vendors can view units of assigned tasks" ON public.units;

CREATE POLICY "Vendors can view units of assigned tasks"
  ON public.units FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.vendors v ON v.id = t.vendor_id AND v.profile_id = auth.uid()
      WHERE t.unit_id = units.id
    )
  );
