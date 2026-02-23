
-- Create storage bucket for task photos
INSERT INTO storage.buckets (id, name, public) VALUES ('task-photos', 'task-photos', true);

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload task photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'task-photos');

-- Allow public read access to task photos
CREATE POLICY "Anyone can view task photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-photos');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete task photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'task-photos');

-- Also add vendor read policy for units (vendors need to see unit info for their tasks)
CREATE POLICY "Vendors can view units of assigned tasks"
  ON public.units FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.unit_id = units.id
        AND tasks.vendor_id = auth.uid()
    )
  );

-- Vendors need to see properties for unit context
CREATE POLICY "Vendors can view properties of assigned tasks"
  ON public.properties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.units
      JOIN public.tasks ON tasks.unit_id = units.id
      WHERE units.property_id = properties.id
        AND tasks.vendor_id = auth.uid()
    )
  );
