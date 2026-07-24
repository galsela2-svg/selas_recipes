"use client";

import type { LucideIcon } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { RecipeCard } from "@/components/recipes/recipe-card";

export function RecipeShelf({
  title,
  icon: Icon,
  recipes,
  badge,
}: {
  title: string;
  icon: LucideIcon;
  recipes: Recipe[];
  badge?: (recipe: Recipe) => string | null;
}) {
  if (recipes.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-1.5 font-serif text-lg font-bold text-foreground">
        <Icon className="size-5 text-accent" />
        {title}
      </p>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {recipes.map((recipe) => (
          <div key={recipe.id} className="w-36 shrink-0 sm:w-40">
            <RecipeCard recipe={recipe} badge={badge?.(recipe) ?? null} />
          </div>
        ))}
      </div>
    </div>
  );
}
