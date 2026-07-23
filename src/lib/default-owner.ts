"use client";

import { useCurrentUserEmail } from "@/lib/queries/auth";
import type { RecipeOwner } from "@/lib/types";

// Household-specific: the two shared accounts map straight to an owner, so
// new recipes default to whoever is signed in (still changeable by hand).
const OWNER_BY_EMAIL: Record<string, RecipeOwner> = {
  "galsela2@gmail.com": "גל",
  "nivatesler@gmail.com": "ניבה",
};

export function useDefaultOwner(): RecipeOwner | null {
  const { data: userEmail } = useCurrentUserEmail();
  return userEmail ? (OWNER_BY_EMAIL[userEmail] ?? null) : null;
}
