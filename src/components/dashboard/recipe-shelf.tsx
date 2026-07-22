"use client";

import Link from "next/link";
import { ImageOff } from "lucide-react";
import type { Recipe } from "@/lib/types";

export function RecipeShelf({
  title,
  recipes,
  badge,
}: {
  title: string;
  recipes: Recipe[];
  badge?: (recipe: Recipe) => string | null;
}) {
  if (recipes.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <p className="font-serif text-lg font-bold text-foreground">{title}</p>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {recipes.map((recipe) => {
          const badgeText = badge?.(recipe) ?? null;
          return (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="group relative flex aspect-[4/5] w-36 shrink-0 flex-col overflow-hidden rounded-xl bg-surface-2 shadow-sm transition-shadow hover:shadow-lg sm:w-40"
            >
              {recipe.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={recipe.image_url}
                  alt={recipe.title}
                  className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted">
                  <ImageOff className="size-6" strokeWidth={1.5} />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="relative mt-auto p-2.5">
                <p className="font-serif line-clamp-2 text-sm font-semibold leading-tight text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.4)]">
                  {recipe.title}
                </p>
                {badgeText && <p className="mt-0.5 text-[11px] text-white/80">{badgeText}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
