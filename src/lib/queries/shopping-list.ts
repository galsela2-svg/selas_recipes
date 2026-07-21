"use client";

import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ShoppingListItem } from "@/lib/types";
import { knownItemKeys } from "@/lib/queries/known-items";

export const shoppingListKeys = {
  all: ["shopping-list"] as const,
};

type ShoppingListRow = ShoppingListItem & {
  recipes: { title: string } | null;
};

async function fetchShoppingList(): Promise<ShoppingListItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("shopping_list_items")
    .select("*, recipes(title)")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data as unknown as ShoppingListRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    checked: row.checked,
    recipe_id: row.recipe_id,
    recipe_title: row.recipes?.title ?? null,
    created_by: row.created_by,
    created_at: row.created_at,
  }));
}

export function useShoppingList() {
  return useQuery({ queryKey: shoppingListKeys.all, queryFn: fetchShoppingList });
}

export function useAddShoppingItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      names,
      recipeId,
    }: {
      names: string[];
      recipeId?: string | null;
    }) => {
      const cleaned = names.map((n) => n.trim()).filter(Boolean);
      if (cleaned.length === 0) return;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("shopping_list_items").insert(
        cleaned.map((name) => ({
          name,
          recipe_id: recipeId ?? null,
          created_by: user?.id ?? null,
        })),
      );

      if (error) throw error;

      await Promise.all(
        cleaned.map((name) =>
          supabase.rpc("record_known_item", { item_name: name }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingListKeys.all });
      queryClient.invalidateQueries({ queryKey: knownItemKeys.all });
    },
  });
}

export function useToggleShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("shopping_list_items")
        .update({ checked })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingListKeys.all });
    },
  });
}

export function useDeleteShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("shopping_list_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingListKeys.all });
    },
  });
}

export function useClearCheckedItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("shopping_list_items")
        .delete()
        .eq("checked", true);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingListKeys.all });
    },
  });
}

function subscribeToShoppingListChanges(queryClient: QueryClient) {
  const supabase = createClient();

  const channel = supabase
    .channel("shopping-list-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "shopping_list_items" },
      () => {
        queryClient.invalidateQueries({ queryKey: shoppingListKeys.all });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function useShoppingListRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeToShoppingListChanges(queryClient);
  }, [queryClient]);
}
