"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Family, FamilyInvite, FamilyMember, InvitePreview } from "@/lib/types";

export const familyKeys = {
  mine: ["family", "mine"] as const,
  members: ["family", "members"] as const,
  invites: ["family", "invites"] as const,
  invitePreview: (token: string) => ["family", "invite-preview", token] as const,
};

async function fetchMyFamily(): Promise<Family | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("families").select("*").maybeSingle();
  if (error) throw error;
  return data as Family | null;
}

/** Every insert into a family-scoped table (recipes, shopping list items,
 * recipe photos, known items) needs to stamp its row with the caller's
 * family_id — there's no database-side default for it. Shared here so each
 * of those mutations doesn't re-derive it separately. */
export async function getCurrentFamilyId(
  supabase: ReturnType<typeof createClient>,
): Promise<string> {
  const { data, error } = await supabase.from("families").select("id").single();
  if (error) throw error;
  return data.id as string;
}

export function useFamily() {
  return useQuery({ queryKey: familyKeys.mine, queryFn: fetchMyFamily });
}

async function fetchFamilyMembers(): Promise<FamilyMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("family_members")
    .select("*")
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return data as FamilyMember[];
}

export function useFamilyMembers() {
  return useQuery({ queryKey: familyKeys.members, queryFn: fetchFamilyMembers });
}

export function useCreateFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ familyName, displayName }: { familyName: string; displayName: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_family", {
        family_name: familyName,
        member_display_name: displayName,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyKeys.mine });
      queryClient.invalidateQueries({ queryKey: familyKeys.members });
    },
  });
}

export function useRenameFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("families").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyKeys.mine });
    },
  });
}

async function fetchFamilyInvites(): Promise<FamilyInvite[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("family_invites")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as FamilyInvite[];
}

export function useFamilyInvites() {
  return useQuery({ queryKey: familyKeys.invites, queryFn: fetchFamilyInvites });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ familyId }: { familyId: string }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const token = crypto.randomUUID();
      const { data, error } = await supabase
        .from("family_invites")
        .insert({ family_id: familyId, token, created_by: user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data as FamilyInvite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyKeys.invites });
    },
  });
}

export function useDeleteInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("family_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyKeys.invites });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("family_members").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyKeys.members });
    },
  });
}

async function fetchInvitePreview(token: string): Promise<InvitePreview | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_invite_preview", { invite_token: token });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? { family_name: row.family_name, is_valid: row.is_valid } : null;
}

export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: familyKeys.invitePreview(token),
    queryFn: () => fetchInvitePreview(token),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useRedeemInvite() {
  return useMutation({
    mutationFn: async ({ token, displayName }: { token: string; displayName: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("redeem_family_invite", {
        invite_token: token,
        member_display_name: displayName,
      });
      if (error) throw error;
      return data as string;
    },
  });
}
