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
  if (ingredients.length === 0) return;
  const supabase = createClient();
  await supabase.rpc("record_known_items", { item_names: ingredients });
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
    // Patches the cache directly with the row Supabase just returned instead
    // of invalidating + refetching the whole collection — same end state,
    // one request instead of two.
    onSuccess: (data) => {
      queryClient.setQueryData<Recipe[]>(recipeKeys.all, (old) => (old ? [data, ...old] : [data]));
      queryClient.setQueryData(recipeKeys.detail(data.id), data);
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
      queryClient.setQueryData<Recipe[]>(recipeKeys.all, (old) =>
        old?.map((r) => (r.id === data.id ? data : r)),
      );
      queryClient.setQueryData(recipeKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: knownItemKeys.all });
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("recipes")
        .update({ is_favorite: isFavorite })
        .eq("id", id);
      if (error) throw error;
    },
    // Optimistic update so the heart flips instantly on tap.
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: recipeKeys.all });
      await queryClient.cancelQueries({ queryKey: recipeKeys.detail(id) });

      const previousList = queryClient.getQueryData<Recipe[]>(recipeKeys.all);
      const previousDetail = queryClient.getQueryData<Recipe>(recipeKeys.detail(id));

      queryClient.setQueryData<Recipe[]>(recipeKeys.all, (old) =>
        old?.map((r) => (r.id === id ? { ...r, is_favorite: isFavorite } : r)),
      );
      queryClient.setQueryData<Recipe>(recipeKeys.detail(id), (old) =>
        old ? { ...old, is_favorite: isFavorite } : old,
      );

      return { previousList, previousDetail, id };
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      queryClient.setQueryData(recipeKeys.all, context.previousList);
      queryClient.setQueryData(recipeKeys.detail(context.id), context.previousDetail);
    },
    // No onSettled refetch — the optimistic update above is already the
    // correct end state on success, and onError above already reverts it on
    // failure, so a follow-up refetch here would only be redundant network
    // traffic (realtime still catches this recipe's real change for *other*
    // devices, this is just avoiding fetching it a second time on this one).
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
    onSuccess: (id) => {
      queryClient.setQueryData<Recipe[]>(recipeKeys.all, (old) => old?.filter((r) => r.id !== id));
      queryClient.removeQueries({ queryKey: recipeKeys.detail(id) });
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
