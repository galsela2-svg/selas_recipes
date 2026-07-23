import { createClient } from "@/lib/supabase/client";

// Reuses the existing public "recipe-photos" bucket (already has the right
// storage policies) under its own prefix — a recipe's cover image is chosen
// before the recipe itself exists yet (new-recipe form), so it can't be
// keyed by recipe id the way recipe_photos rows are.
const BUCKET = "recipe-photos";

export async function uploadCoverImage(file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `covers/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || "image/jpeg" });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return publicUrl;
}
