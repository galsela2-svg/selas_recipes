"use client";

import { useMemo } from "react";
import { useRecipes } from "@/lib/queries/recipes";

export function useTags() {
  const { data: recipes } = useRecipes();

  return useMemo(() => {
    const tagSet = new Set<string>();
    for (const recipe of recipes ?? []) {
      for (const tag of recipe.tags) tagSet.add(tag);
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [recipes]);
}
