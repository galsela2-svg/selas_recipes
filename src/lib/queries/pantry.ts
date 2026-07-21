"use client";

import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { PantryItem } from "@/lib/types";

export const pantryKeys = {
  all: ["pantry"] as const,
};

async function fetchPantryItems(): Promise<PantryItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pantry_items")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data as PantryItem[];
}

export function usePantryItems() {
  return useQuery({ queryKey: pantryKeys.all, queryFn: fetchPantryItems });
}

export function useAddPantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("pantry_items")
        .upsert(
          { name: trimmed, created_by: user?.id ?? null },
          { onConflict: "name", ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.all });
    },
  });
}

export function useRemovePantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("pantry_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.all });
    },
  });
}

function subscribeToPantryChanges(queryClient: QueryClient) {
  const supabase = createClient();

  const channel = supabase
    .channel("pantry-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pantry_items" },
      () => {
        queryClient.invalidateQueries({ queryKey: pantryKeys.all });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function usePantryRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeToPantryChanges(queryClient);
  }, [queryClient]);
}

/** Fuzzy match: is this ingredient line likely already in the pantry? */
export function isIngredientInPantry(ingredient: string, pantryNames: string[]): boolean {
  const lower = ingredient.toLowerCase();
  return pantryNames.some((name) => lower.includes(name.toLowerCase()));
}
