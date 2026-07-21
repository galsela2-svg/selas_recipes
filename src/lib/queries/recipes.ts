"use client";

import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Recipe, RecipeInput } from "@/lib/types";
import { knownItemKeys } from "@/lib/queries/known-items";

async function recordIngredientHistory(ingredients: string[]) {
  const supabase = createClient();
  await Promise.all(
    ingredients.map((name) =>
      supabase.rpc("record_known_item", { item_name: name }),
    ),
  );
}

export const recipeKeys = {
  all: ["recipes"] as const,
  detail: (id: string) => ["recipes", id] as const,
};

async function fetchRecipes(): Promise<Recipe[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Recipe[];
}

async function fetchRecipe(id: string): Promise<Recipe> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Recipe;
}

export function useRecipes() {
  return useQuery({ queryKey: recipeKeys.all, queryFn: fetchRecipes });
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: recipeKeys.detail(id),
    queryFn: () => fetchRecipe(id),
    enabled: Boolean(id),
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecipeInput) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("recipes")
        .insert({ ...input, created_by: user?.id ?? null })
        .select()
        .single();

      if (error) throw error;
      await recordIngredientHistory(input.ingredients);
      return data as Recipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      queryClient.invalidateQueries({ queryKey: knownItemKeys.all });
    },
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: RecipeInput }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("recipes")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      await recordIngredientHistory(input.ingredients);
      return data as Recipe;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: knownItemKeys.all });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
    },
  });
}

function subscribeToRecipeChanges(queryClient: QueryClient) {
  const supabase = createClient();

  const channel = supabase
    .channel("recipes-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "recipes" },
      () => {
        queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function useRecipesRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeToRecipeChanges(queryClient);
  }, [queryClient]);
}
