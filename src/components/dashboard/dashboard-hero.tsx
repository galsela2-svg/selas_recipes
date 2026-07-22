"use client";

import Link from "next/link";
import { ImageOff } from "lucide-react";
import type { Recipe } from "@/lib/types";

export function DashboardHero({ recipe, eyebrow }: { recipe: Recipe; eyebrow: string }) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group relative flex h-56 w-full flex-col overflow-hidden rounded-2xl bg-surface-2 shadow-sm transition-shadow hover:shadow-xl"
    >
      {recipe.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.image_url}
          alt={recipe.title}
          className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-surface-2 text-muted">
          <ImageOff className="size-10" strokeWidth={1.5} />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" />

      <div className="relative mt-auto space-y-1 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-white/80">{eyebrow}</p>
        <h2 className="font-serif line-clamp-2 text-2xl font-bold leading-tight text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]">
          {recipe.title}
        </h2>
        {recipe.description && (
          <p className="line-clamp-1 text-sm text-white/80">{recipe.description}</p>
        )}
      </div>
    </Link>
  );
}
