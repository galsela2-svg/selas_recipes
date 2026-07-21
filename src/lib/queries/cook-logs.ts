"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { CookLog } from "@/lib/types";

export const cookLogKeys = {
  forRecipe: (recipeId: string) => ["cook-logs", recipeId] as const,
};

async function fetchCookLogs(recipeId: string): Promise<CookLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cook_logs")
    .select("*")
    .eq("recipe_id", recipeId)
    .order("cooked_on", { ascending: false });

  if (error) throw error;
  return data as CookLog[];
}

export function useCookLogs(recipeId: string) {
  return useQuery({
    queryKey: cookLogKeys.forRecipe(recipeId),
    queryFn: () => fetchCookLogs(recipeId),
    enabled: Boolean(recipeId),
  });
}

/** All cook logs across every recipe — used for the full-data export/backup. */
export async function fetchAllCookLogs(): Promise<CookLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cook_logs")
    .select("*")
    .order("cooked_on", { ascending: false });

  if (error) throw error;
  return data as CookLog[];
}

export function useAddCookLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipeId,
      cookedOn,
      rating,
      notes,
    }: {
      recipeId: string;
      cookedOn: string;
      rating: number | null;
      notes: string | null;
    }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("cook_logs").insert({
        recipe_id: recipeId,
        cooked_on: cookedOn,
        rating,
        notes: notes?.trim() || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_x, { recipeId }) => {
      queryClient.invalidateQueries({ queryKey: cookLogKeys.forRecipe(recipeId) });
    },
  });
}

export function useDeleteCookLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; recipeId: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("cook_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_x, { recipeId }) => {
      queryClient.invalidateQueries({ queryKey: cookLogKeys.forRecipe(recipeId) });
    },
  });
}
