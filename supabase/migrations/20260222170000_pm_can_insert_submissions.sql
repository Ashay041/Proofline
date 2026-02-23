-- PMs need to insert into task_submissions when requesting rework (stores the rework snapshot).
CREATE POLICY "PMs can insert submissions for own tasks"
  ON public.task_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_submissions.task_id
        AND tasks.pm_id = auth.uid()
    )
  );
