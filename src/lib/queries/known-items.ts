"use client";

import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { KnownItem } from "@/lib/types";

export const knownItemKeys = {
  all: ["known-items"] as const,
  detailed: ["known-items", "detailed"] as const,
};

async function fetchKnownItems(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("known_items")
    .select("name")
    .order("use_count", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data ?? []).map((row) => row.name as string);
}

export function useKnownItems() {
  return useQuery({
    queryKey: knownItemKeys.all,
    queryFn: fetchKnownItems,
    staleTime: 60_000,
  });
}

async function fetchKnownItemsDetailed(): Promise<KnownItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("known_items")
    .select("*")
    .order("pinned", { ascending: false })
    .order("use_count", { ascending: false })
    .order("name", { ascending: true })
    .limit(500);

  if (error) throw error;
  return data as KnownItem[];
}

/** Full rows (pinned + use_count), used by the quick-add bar and the management drawer. */
export function useKnownItemsDetailed() {
  return useQuery({
    queryKey: knownItemKeys.detailed,
    queryFn: fetchKnownItemsDetailed,
  });
}

function invalidateKnownItems(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: knownItemKeys.all });
  queryClient.invalidateQueries({ queryKey: knownItemKeys.detailed });
}

// Fire-and-forget usage tracking, called once per ingredient as it's typed
// into a recipe — deliberately does *not* invalidate/refetch the known-items
// lists on success. That used to force a full refetch (up to 500 rows) on
// every single ingredient added while filling out a recipe, which made
// typing feel laggy; the new/bumped item shows up next time those lists
// naturally refetch (staleTime, navigation, or another mutation).
export function useRecordKnownItems() {
  return useMutation({
    mutationFn: async (names: string[]) => {
      const cleaned = Array.from(
        new Set(names.map((n) => n.trim()).filter(Boolean)),
      );
      if (cleaned.length === 0) return;

      const supabase = createClient();
      await Promise.all(
        cleaned.map((name) =>
          supabase.rpc("record_known_item", { item_name: name }),
        ),
      );
    },
  });
}

/** Manually add a permanent token from the management drawer. */
export function useAddKnownItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, pinned }: { name: string; pinned: boolean }) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      const supabase = createClient();
      const { error } = await supabase
        .from("known_items")
        .upsert(
          { name: trimmed, pinned, use_count: 1, updated_at: new Date().toISOString() },
          { onConflict: "name" },
        );
      if (error) throw error;
    },
    onSuccess: () => invalidateKnownItems(queryClient),
  });
}

export function useTogglePinKnownItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, pinned }: { name: string; pinned: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("known_items")
        .update({ pinned })
        .eq("name", name);
      if (error) throw error;
    },
    onSuccess: () => invalidateKnownItems(queryClient),
  });
}

export function useRenameKnownItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) return;

      const supabase = createClient();
      const { error } = await supabase
        .from("known_items")
        .update({ name: trimmed })
        .eq("name", oldName);
      if (error) throw error;
    },
    onSuccess: () => invalidateKnownItems(queryClient),
  });
}

export function useDeleteKnownItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("known_items").delete().eq("name", name);
      if (error) throw error;
    },
    onSuccess: () => invalidateKnownItems(queryClient),
  });
}

function subscribeToKnownItemChanges(queryClient: QueryClient) {
  const supabase = createClient();

  const channel = supabase
    .channel("known-items-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "known_items" },
      () => invalidateKnownItems(queryClient),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function useKnownItemsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeToKnownItemChanges(queryClient);
  }, [queryClient]);
}
