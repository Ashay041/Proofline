-- Unit documents table (floor plans, spreadsheets, etc.)
CREATE TABLE public.unit_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.unit_documents ENABLE ROW LEVEL SECURITY;

-- PMs can CRUD documents for units they own (via properties)
CREATE POLICY "PMs can manage documents for own units"
  ON public.unit_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.units u
      JOIN public.properties p ON p.id = u.property_id
      WHERE u.id = unit_documents.unit_id
        AND p.pm_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.units u
      JOIN public.properties p ON p.id = u.property_id
      WHERE u.id = unit_documents.unit_id
        AND p.pm_id = auth.uid()
    )
  );

-- Vendors can view documents for units of tasks assigned to them
CREATE POLICY "Vendors can view documents for assigned task units"
  ON public.unit_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.vendors v ON v.id = t.vendor_id AND v.profile_id = auth.uid()
      WHERE t.unit_id = unit_documents.unit_id
    )
  );
