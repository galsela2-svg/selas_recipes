"use client";

import Link from "next/link";
import { Clock, Heart, ImageOff } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { formatMinutes } from "@/lib/utils";
import { useToggleFavorite } from "@/lib/queries/recipes";

// One square format for every recipe card in the app, image or not — a
// dark gradient anchors the title (and optional badge) to the bottom edge
// so it stays readable over any photo, and a plain surface fallback gets
// the same treatment when there's no image yet.
export function RecipeCard({
  recipe,
  badge,
}: {
  recipe: Recipe;
  badge?: string | null;
}) {
  const toggleFavorite = useToggleFavorite();
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  function handleToggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite.mutate({ id: recipe.id, isFavorite: !recipe.is_favorite });
  }

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group relative flex aspect-square w-full flex-col overflow-hidden rounded-xl bg-surface-2 shadow-sm transition-shadow hover:shadow-xl"
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
          <ImageOff className="size-8" strokeWidth={1.5} />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

      <button
        onClick={handleToggleFavorite}
        className="absolute end-1.5 top-1.5 z-10 flex size-7 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm cursor-pointer transition-transform active:scale-90"
      >
        <Heart
          className={recipe.is_favorite ? "size-3.5 fill-danger text-danger" : "size-3.5 text-white"}
        />
      </button>

      <div className="relative mt-auto flex flex-col gap-0.5 p-2">
        <h3 className="font-serif line-clamp-2 text-xs font-semibold leading-tight text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.4)]">
          {recipe.title}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-white/85">
          {totalTime > 0 && (
            <span className="flex items-center gap-0.5">
              <Clock className="size-2.5" />
              {formatMinutes(totalTime)}
            </span>
          )}
          {badge && <span className="text-white/85">{badge}</span>}
        </div>
      </div>
    </Link>
  );
}
