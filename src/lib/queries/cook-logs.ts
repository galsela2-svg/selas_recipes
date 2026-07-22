"use client";

import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { CookLog } from "@/lib/types";

export const cookLogKeys = {
  all: ["cook-logs"] as const,
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

/** All cook logs across every recipe — used for the export/backup and for achievements. */
export async function fetchAllCookLogs(): Promise<CookLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cook_logs")
    .select("*")
    .order("cooked_on", { ascending: false });

  if (error) throw error;
  return data as CookLog[];
}

export function useAllCookLogs() {
  return useQuery({ queryKey: cookLogKeys.all, queryFn: fetchAllCookLogs });
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
      queryClient.invalidateQueries({ queryKey: cookLogKeys.all });
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
      queryClient.invalidateQueries({ queryKey: cookLogKeys.all });
    },
  });
}

function subscribeToCookLogChanges(queryClient: QueryClient) {
  const supabase = createClient();

  const channel = supabase
    .channel("cook-logs-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "cook_logs" },
      (payload) => {
        queryClient.invalidateQueries({ queryKey: cookLogKeys.all });
        const recipeId =
          (payload.new as { recipe_id?: string } | null)?.recipe_id ??
          (payload.old as { recipe_id?: string } | null)?.recipe_id;
        if (recipeId) {
          queryClient.invalidateQueries({ queryKey: cookLogKeys.forRecipe(recipeId) });
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function useCookLogsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeToCookLogChanges(queryClient);
  }, [queryClient]);
}
