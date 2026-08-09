"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Recipe, RecipeShare } from "@/lib/types";

export const recipeShareKeys = {
  shared: (token: string) => ["recipe-shares", "shared", token] as const,
};

export function useCreateRecipeShare() {
  return useMutation({
    mutationFn: async (recipeId: string) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const token = crypto.randomUUID();
      const { data, error } = await supabase
        .from("recipe_shares")
        .insert({ recipe_id: recipeId, token, created_by: user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data as RecipeShare;
    },
  });
}

async function fetchSharedRecipe(token: string): Promise<Recipe | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_shared_recipe", { share_token: token });
  if (error) throw error;
  return (data as Recipe | null) ?? null;
}

export function useSharedRecipe(token: string) {
  return useQuery({
    queryKey: recipeShareKeys.shared(token),
    queryFn: () => fetchSharedRecipe(token),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useImportSharedRecipe() {
  return useMutation({
    mutationFn: async (token: string) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("import_shared_recipe", { share_token: token });
      if (error) throw error;
      return data as Recipe;
    },
  });
}
