"use client";

import { useEffect, useRef } from "react";
import { useUpdateRecipe } from "@/lib/queries/recipes";
import type { Recipe, RecipeInput } from "@/lib/types";

function toInput(recipe: Recipe, image_url: string): RecipeInput {
  return {
    title: recipe.title,
    description: recipe.description,
    image_url,
    source_url: recipe.source_url,
    prep_time_minutes: recipe.prep_time_minutes,
    cook_time_minutes: recipe.cook_time_minutes,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    tags: recipe.tags,
    dietary_tags: recipe.dietary_tags,
    made_by: recipe.made_by,
  };
}

/**
 * Best-effort, silent: every time the dashboard loads with recipes that
 * still have no cover image, this searches for and sets one in the
 * background, one at a time, so a recipe added without a photo doesn't
 * just sit there imageless forever — it gets one on the next visit instead
 * of only when (if ever) that specific recipe's own page happens to be
 * opened. Each recipe is only attempted once per page load; a search that
 * comes up empty just leaves it for a later visit rather than retrying in
 * a loop.
 */
export function useBackfillMissingCoverImages(recipes: Recipe[] | undefined) {
  const updateRecipe = useUpdateRecipe();
  const attempted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!recipes) return;
    const missing = recipes.filter((r) => !r.image_url && !attempted.current.has(r.id));
    if (missing.length === 0) return;

    let cancelled = false;

    (async () => {
      for (const recipe of missing) {
        if (cancelled) return;
        attempted.current.add(recipe.id);

        try {
          const res = await fetch("/api/find-cover-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: recipe.title }),
          });
          if (!res.ok || cancelled) continue;
          const body = await res.json();
          if (!body?.image_url || cancelled) continue;
          updateRecipe.mutate({ id: recipe.id, input: toInput(recipe, body.image_url as string) });
        } catch {
          // Best-effort — a failed search just leaves this recipe for the
          // next visit, same as before.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes]);
}
