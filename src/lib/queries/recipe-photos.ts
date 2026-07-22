"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RecipePhoto } from "@/lib/types";

const BUCKET = "recipe-photos";

export const recipePhotoKeys = {
  forRecipe: (recipeId: string) => ["recipe-photos", recipeId] as const,
  totalCount: ["recipe-photos", "total-count"] as const,
};

async function fetchTotalPhotoCount(): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("recipe_photos")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/** Total "real result" photos across every recipe — used for achievements. */
export function useTotalPhotoCount() {
  return useQuery({
    queryKey: recipePhotoKeys.totalCount,
    queryFn: fetchTotalPhotoCount,
  });
}

function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

async function fetchRecipePhotos(recipeId: string): Promise<RecipePhoto[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recipe_photos")
    .select("*")
    .eq("recipe_id", recipeId)
    .order("taken_at", { ascending: false });

  if (error) throw error;
  return data as RecipePhoto[];
}

export function useRecipePhotos(recipeId: string) {
  return useQuery({
    queryKey: recipePhotoKeys.forRecipe(recipeId),
    queryFn: () => fetchRecipePhotos(recipeId),
    enabled: Boolean(recipeId),
  });
}

export function useAddRecipePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipeId,
      file,
    }: {
      recipeId: string;
      file: File;
    }) => {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${recipeId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          upsert: false,
          contentType: file.type || "image/jpeg",
        });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from("recipe_photos")
        .insert({ recipe_id: recipeId, url: publicUrl, created_by: user?.id ?? null });
      if (insertError) throw insertError;

      return publicUrl;
    },
    onSuccess: (_url, { recipeId }) => {
      queryClient.invalidateQueries({ queryKey: recipePhotoKeys.forRecipe(recipeId) });
    },
  });
}

export function useRemoveRecipePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      photo,
    }: {
      recipeId: string;
      photo: RecipePhoto;
    }) => {
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from("recipe_photos")
        .delete()
        .eq("id", photo.id);
      if (deleteError) throw deleteError;

      const path = storagePathFromPublicUrl(photo.url);
      if (path) {
        await supabase.storage.from(BUCKET).remove([path]);
      }
    },
    onSuccess: (_x, { recipeId }) => {
      queryClient.invalidateQueries({ queryKey: recipePhotoKeys.forRecipe(recipeId) });
    },
  });
}
