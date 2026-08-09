"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AdminUserRow, Family, FamilyInvite, FamilyMember, InvitePreview } from "@/lib/types";
import { ACCENT_PRESETS } from "@/lib/settings-store";
import { describeError } from "@/lib/utils";

/** Resolves a member's stored color id (an ACCENT_PRESETS id, or null if
 * they haven't picked one) to the actual preset — the single place that
 * knows how to turn `member.color` into real CSS colors. */
export function getMemberColorPreset(colorId: string | null | undefined) {
  return ACCENT_PRESETS.find((p) => p.id === colorId) ?? null;
}

/** Every mutation on this page touches something added by a recent
 * supabase/schema.sql change (the color column, the admin RLS policies,
 * admin_list_users). If that file hasn't been (fully) re-run against the
 * right Supabase project yet, PostgREST's error message says so — "Could
 * not find the X column/function ... in the schema cache" — so this
 * surfaces that specific, actionable hint instead of a generic failure. */
export function describeFamilySchemaError(err: unknown, fallback: string): string {
  const message = describeError(err, fallback);
  if (/could not find the .*(column|function).*schema cache/i.test(message)) {
    return `${message} — נראה ש-supabase/schema.sql לא הורץ (או לא במלואו) בפרויקט ה-Supabase הנכון. הריצו את כל הקובץ מחדש ב-SQL Editor.`;
  }
  return message;
}

export const familyKeys = {
  mine: ["family", "mine"] as const,
  members: ["family", "members"] as const,
  invites: ["family", "invites"] as const,
  invitePreview: (token: string) => ["family", "invite-preview", token] as const,
  adminUsers: ["family", "admin-users"] as const,
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

/** Any family member can set any other member's color — a plain update
 * against the "Members can update their family's members" RLS policy in
 * schema.sql (not an RPC), since this whole app treats a household as a
 * fully co-equal, trusted group everywhere else too. */
export function useSetMemberColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, color }: { userId: string; color: string | null }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("family_members")
        .update({ color })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onMutate: async ({ userId, color }) => {
      await queryClient.cancelQueries({ queryKey: familyKeys.members });
      const previous = queryClient.getQueryData<FamilyMember[]>(familyKeys.members);
      queryClient.setQueryData<FamilyMember[]>(familyKeys.members, (old) =>
        old?.map((m) => (m.user_id === userId ? { ...m, color } : m)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context) queryClient.setQueryData(familyKeys.members, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: familyKeys.members });
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

/** Cross-family, admin-only user listing — has to be an RPC (see the note
 * above admin_list_users in schema.sql): it needs to join against
 * auth.users for emails, which isn't reachable through RLS on a
 * public-schema table. The function itself re-checks the caller's email
 * server-side, so hiding this from the nav for everyone else is purely a
 * UI nicety, not the actual boundary. */
async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) throw error;
  return data as AdminUserRow[];
}

export function useAdminUsers() {
  return useQuery({ queryKey: familyKeys.adminUsers, queryFn: fetchAdminUsers });
}

/** Plain updates/deletes against the "App admin can ..." RLS policies on
 * family_members in schema.sql (not RPCs) — those policies re-check the
 * caller's email server-side the same way the admin_list_users function
 * does, so this isn't relying on the client-side email check either. */
export function useAdminRenameMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, name }: { userId: string; name: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("family_members")
        .update({ display_name: name })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyKeys.adminUsers });
      queryClient.invalidateQueries({ queryKey: familyKeys.members });
    },
  });
}

export function useAdminRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("family_members").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyKeys.adminUsers });
      queryClient.invalidateQueries({ queryKey: familyKeys.members });
    },
  });
}
