"use client";

import Link from "next/link";
import { CircleCheck, Clock, Heart, ImageOff } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { cn, formatMinutes } from "@/lib/utils";
import { useToggleFavorite } from "@/lib/queries/recipes";

export function RecipeCard({
  recipe,
  missingCount,
}: {
  recipe: Recipe;
  missingCount?: number;
}) {
  const toggleFavorite = useToggleFavorite();
  const totalTime =
    (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  function handleToggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite.mutate({ id: recipe.id, isFavorite: !recipe.is_favorite });
  }

  const heartButton = (
    <button
      onClick={handleToggleFavorite}
      className="absolute end-1.5 top-1.5 z-10 flex size-7 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm cursor-pointer transition-transform active:scale-90"
    >
      <Heart
        className={
          recipe.is_favorite ? "size-3.5 fill-danger text-danger" : "size-3.5 text-white"
        }
      />
    </button>
  );

  const missingBadge = missingCount !== undefined && (
    <span
      className={cn(
        "flex items-center gap-0.5 text-[10px] font-medium",
        missingCount === 0 ? "text-success" : "text-muted",
      )}
    >
      {missingCount === 0 ? (
        <>
          <CircleCheck className="size-3" />
          יש הכול!
        </>
      ) : (
        `חסרים ${missingCount}`
      )}
    </span>
  );

  // Portrait framing deliberately echoes an Instagram post/reel — most
  // recipes here were saved from Instagram, so the card language matches
  // the source instead of a generic landscape thumbnail grid.
  if (!recipe.image_url) {
    return (
      <Link
        href={`/recipes/${recipe.id}`}
        className="group flex flex-col overflow-hidden rounded-xl bg-surface shadow-sm transition-shadow hover:shadow-lg"
      >
        <div className="relative flex aspect-[4/5] w-full items-center justify-center bg-surface-2 text-muted">
          <ImageOff className="size-6" strokeWidth={1.5} />
          {heartButton}
        </div>
        <div className="flex flex-1 flex-col gap-0.5 p-2">
          <h3 className="font-serif line-clamp-2 text-xs font-semibold leading-tight text-foreground">
            {recipe.title}
          </h3>
          {totalTime > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted">
              <Clock className="size-2.5" />
              {formatMinutes(totalTime)}
            </div>
          )}
          {missingBadge}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group relative flex aspect-[4/5] w-full flex-col overflow-hidden rounded-xl bg-surface-2 shadow-sm transition-shadow hover:shadow-xl"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={recipe.image_url}
        alt={recipe.title}
        className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
      {heartButton}

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
          {missingCount !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5",
                missingCount === 0 ? "text-success" : "text-white/85",
              )}
            >
              {missingCount === 0 ? (
                <>
                  <CircleCheck className="size-3" />
                  יש הכול!
                </>
              ) : (
                `חסרים ${missingCount}`
              )}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
