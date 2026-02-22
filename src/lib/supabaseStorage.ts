import { supabase } from "@/integrations/supabase/client";

const BUCKET = "task-photos";

export async function uploadTaskPhoto(taskId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${taskId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
