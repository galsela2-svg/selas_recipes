"use client";

import Link from "next/link";
import { BookOpen, ChevronLeft, Tag, type LucideIcon } from "lucide-react";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { useSettings } from "@/components/providers/settings-provider";
import { OTHER_CATEGORY_SLUG } from "@/lib/meal-type-sections";
import type { Recipe } from "@/lib/types";

/** One category "shelf": a heading that links to the full category page,
 * and a horizontally-scrolling 3-row grid (roughly 9 recipes visible at
 * once on a phone) instead of a wrapping grid that grows the page taller
 * the more recipes a category has. */
function SectionPanel({
  href,
  icon: Icon,
  label,
  recipes,
  selectable,
  selectedIds,
  onToggleSelect,
  highlightedId,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  recipes: Recipe[];
  selectable: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  highlightedId?: string | null;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface-2 p-3">
      <Link
        href={href}
        className="flex items-center gap-1.5 font-serif text-lg font-bold text-foreground hover:text-accent"
      >
        <Icon className="size-5 shrink-0 text-accent" />
        <span className="truncate">{label}</span>
        <ChevronLeft className="size-4 shrink-0 text-muted" />
      </Link>
      {/* Explicitly placed, not grid-auto-flow: recipes fill row by row (1,2,3
          on top, 4 starts the row below it) three at a time, and once a 3x3
          "page" is full the next one starts in the three columns beside it
          — grid-auto-flow can only overflow along a single axis (more rows
          *or* more columns), never "row-major within a capped height", so
          each card's row/column is computed here instead. Row count is
          capped at 3 and otherwise sized to what's actually needed, so a
          panel with only 1-2 rows worth of recipes shrinks instead of
          leaving dead space. */}
      <div
        className="grid auto-cols-[31%] gap-2 overflow-x-auto pb-1 snap-x snap-mandatory sm:auto-cols-[23%] lg:auto-cols-[18%]"
        style={{
          gridTemplateRows: `repeat(${Math.min(3, Math.ceil(recipes.length / 3))}, minmax(0, 1fr))`,
        }}
      >
        {recipes.map((recipe, i) => {
          const page = Math.floor(i / 9);
          const posInPage = i % 9;
          const row = Math.floor(posInPage / 3) + 1;
          const column = page * 3 + (posInPage % 3) + 1;
          return (
            <div key={recipe.id} className="snap-start" style={{ gridRow: row, gridColumn: column }}>
              <RecipeCard
                recipe={recipe}
                selectable={selectable}
                selected={selectedIds?.has(recipe.id)}
                onToggleSelect={() => onToggleSelect?.(recipe.id)}
                highlighted={recipe.id === highlightedId}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The "browse everything" view, laid out like a cookbook's table of
 * contents — grouped into chapters (a recipe tagged for more than one
 * category shows up in each) instead of one long undifferentiated grid.
 * Which categories show, and in what order, is a per-device preference set
 * in Settings → קטגוריות בעמוד הראשי. Anything not in any of them still
 * shows up, under "מתכונים נוספים".
 */
export function CategorizedRecipeGrid({
  recipes,
  selectedIds,
  onToggleSelect,
  highlightedId,
}: {
  recipes: Recipe[];
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  highlightedId?: string | null;
}) {
  const [settings] = useSettings();

  const sections = settings.dashboardCategoryTags
    .map((tag) => ({
      tag,
      recipes: recipes.filter((r) => r.dietary_tags.includes(tag)),
    }))
    .filter((section) => section.recipes.length > 0);

  const categorizedIds = new Set(sections.flatMap((s) => s.recipes.map((r) => r.id)));
  const rest = recipes.filter((r) => !categorizedIds.has(r.id));
  const selectable = Boolean(selectedIds);

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <SectionPanel
          key={section.tag}
          href={`/dashboard/category/${encodeURIComponent(section.tag)}`}
          icon={Tag}
          label={section.tag}
          recipes={section.recipes}
          selectable={selectable}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          highlightedId={highlightedId}
        />
      ))}

      {rest.length > 0 && (
        <SectionPanel
          href={`/dashboard/category/${OTHER_CATEGORY_SLUG}`}
          icon={BookOpen}
          label="מתכונים נוספים"
          recipes={rest}
          selectable={selectable}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          highlightedId={highlightedId}
        />
      )}
    </div>
  );
}
