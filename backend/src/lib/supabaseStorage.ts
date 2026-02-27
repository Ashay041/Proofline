/**
 * File upload to Supabase Storage.
 * Single Responsibility: upload file and return public URL.
 */
import { supabase } from "../integrations/supabase/client";

const TASK_PHOTOS_BUCKET = "task-photos";
const UNIT_DOCS_BUCKET = "unit-documents";

export async function uploadTaskPhoto(taskId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${taskId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(TASK_PHOTOS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(TASK_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadUnitDocument(unitId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${unitId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(UNIT_DOCS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(UNIT_DOCS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
