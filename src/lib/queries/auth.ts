"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

async function fetchCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export function useCurrentUserId() {
  return useQuery({
    queryKey: ["auth", "current-user-id"],
    queryFn: fetchCurrentUserId,
    staleTime: Infinity,
  });
}

async function fetchCurrentUserEmail(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

export function useCurrentUserEmail() {
  return useQuery({
    queryKey: ["auth", "current-user-email"],
    queryFn: fetchCurrentUserEmail,
    staleTime: Infinity,
  });
}
