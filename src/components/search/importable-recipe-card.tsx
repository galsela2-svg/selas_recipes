"use client";

import { Clock, Gauge, ImageOff, Loader2, Users } from "lucide-react";
import type { ParsedRecipe } from "@/lib/types";
import { estimateDifficulty } from "@/lib/recipe-difficulty";
import { formatMinutes } from "@/lib/utils";

export function ImportableRecipeCard({
  recipe,
  onImport,
  saving,
}: {
  recipe: ParsedRecipe;
  onImport: (recipe: ParsedRecipe) => void;
  saving?: boolean;
}) {
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  const difficulty = estimateDifficulty(recipe);

  return (
    <div
      onClick={() => !saving && onImport(recipe)}
      aria-busy={saving}
      className="relative flex items-stretch gap-3 overflow-hidden rounded-xl border border-border bg-surface text-start transition-colors hover:border-accent/50 cursor-pointer"
    >
      {saving && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/70">
          <Loader2 className="size-5 animate-spin text-accent" />
        </div>
      )}
      <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden bg-surface-2 text-muted">
        {recipe.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={recipe.image_url} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <ImageOff className="size-6" strokeWidth={1.5} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-2 pe-3">
        <p className="font-serif line-clamp-2 text-base font-semibold leading-tight text-foreground">
          {recipe.title}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {formatMinutes(totalTime)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Gauge className="size-3.5" />
            {difficulty}
          </span>
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {recipe.servings} מנות
            </span>
          )}
        </div>
        {recipe.ingredients.length > 0 && (
          <p className="text-xs text-muted">{recipe.ingredients.length} מרכיבים</p>
        )}
        <p className="truncate text-xs text-muted" dir="ltr">
          {new URL(recipe.source_url).hostname.replace(/^www\./, "")}
        </p>
      </div>
    </div>
  );
}
