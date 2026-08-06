"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Clock, Heart, ImageOff } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { cn, formatMinutes } from "@/lib/utils";

// One square format for every recipe card in the app, image or not — a
// dark gradient anchors the title (and optional badge) to the bottom edge
// so it stays readable over any photo, and a plain surface fallback gets
// the same treatment when there's no image yet.
export function RecipeCard({
  recipe,
  badge,
  selectable,
  selected,
  onToggleSelect,
  highlighted,
}: {
  recipe: Recipe;
  badge?: string | null;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  highlighted?: boolean;
}) {
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  function handleClick(e: React.MouseEvent) {
    if (!selectable) return;
    e.preventDefault();
    onToggleSelect?.();
  }

  return (
    <Link
      id={`recipe-${recipe.id}`}
      href={`/recipes/${recipe.id}`}
      onClick={handleClick}
      className={cn(
        "group relative flex aspect-square w-full flex-col overflow-hidden rounded-xl bg-surface-2 shadow-sm transition-shadow hover:shadow-xl",
        selectable && selected && "ring-2 ring-accent",
        highlighted && "ring-4 ring-accent animate-pulse",
      )}
    >
      {recipe.image_url ? (
        // Recipe images come from arbitrary external sites/Instagram, not
        // just our own Storage bucket, so a next/image domain allowlist
        // isn't practical here (same reasoning as the recipe detail page).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.image_url}
          alt={recipe.title}
          className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted">
          <ImageOff className="size-8" strokeWidth={1.5} />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

      {selectable ? (
        <span className="absolute start-1.5 top-1.5 z-10 flex size-7 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm">
          {selected ? (
            <CheckCircle2 className="size-4.5 fill-accent text-white" />
          ) : (
            <Circle className="size-4.5 text-white" />
          )}
        </span>
      ) : (
        // Favoriting itself only happens from inside the recipe (its own
        // page has the toggle) — this is a passive indicator, not a
        // button, and only takes up space when the recipe actually is one.
        recipe.is_favorite && (
          <span className="absolute end-1.5 top-1.5 z-10 flex size-7 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm">
            <Heart className="size-3.5 fill-danger text-danger" />
          </span>
        )
      )}

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
