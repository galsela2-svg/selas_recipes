"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ChefHat,
  ChevronDown,
  Heart,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import { useRecipes } from "@/lib/queries/recipes";
import { useTags } from "@/lib/queries/tags";
import { useAllCookLogs } from "@/lib/queries/cook-logs";
import { usePantryItems, isIngredientInPantry } from "@/lib/queries/pantry";
import { DIETARY_TAG_GROUPS } from "@/lib/types";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { RecipeShelf } from "@/components/dashboard/recipe-shelf";
import { CategoryTiles, type CategoryTile } from "@/components/dashboard/category-tiles";
import { CategorizedRecipeGrid } from "@/components/dashboard/categorized-recipe-grid";
import { WebRecipeSuggestions } from "@/components/dashboard/web-recipe-suggestions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type TimeBucket = "short" | "medium" | "long";

const TIME_BUCKETS: { value: TimeBucket; label: string }[] = [
  { value: "short", label: "קצר (עד 30 דק׳)" },
  { value: "medium", label: "בינוני (30-60 דק׳)" },
  { value: "long", label: "ארוך (60+ דק׳)" },
];

function matchesTimeBucket(totalMinutes: number, bucket: TimeBucket): boolean {
  if (totalMinutes <= 0) return false;
  if (bucket === "short") return totalMinutes <= 30;
  if (bucket === "medium") return totalMinutes > 30 && totalMinutes <= 60;
  return totalMinutes > 60;
}

// Only "short" has a search-friendly translation — "medium"/"long" don't
// map to a phrase people actually search recipe sites for.
const TIME_BUCKET_SEARCH_HINT: Partial<Record<TimeBucket, string>> = {
  short: "מהיר וקל",
};

export default function DashboardPage() {
  const { data: recipes, isLoading } = useRecipes();
  const { data: pantryItems } = usePantryItems();
  const { data: cookLogs } = useAllCookLogs();
  const tags = useTags();
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [timeBucket, setTimeBucket] = useState<TimeBucket | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [cookNowMode, setCookNowMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const pantryNames = useMemo(() => (pantryItems ?? []).map((p) => p.name), [pantryItems]);

  const countMissing = useCallback(
    (ingredients: string[]): number =>
      ingredients.filter((ing) => !isIngredientInPantry(ing, pantryNames)).length,
    [pantryNames],
  );

  const ratingByRecipeId = useMemo(() => {
    const sums = new Map<string, { total: number; count: number }>();
    for (const log of cookLogs ?? []) {
      if (log.rating === null) continue;
      const entry = sums.get(log.recipe_id) ?? { total: 0, count: 0 };
      entry.total += log.rating;
      entry.count += 1;
      sums.set(log.recipe_id, entry);
    }
    const averages = new Map<string, number>();
    for (const [recipeId, { total, count }] of sums) {
      averages.set(recipeId, total / count);
    }
    return averages;
  }, [cookLogs]);

  // Recipes are already fetched ordered by created_at desc, so [0] is the
  // most recent and the first favorite found is the most recently favorited.
  const heroRecipe = useMemo(() => {
    if (!recipes || recipes.length === 0) return null;
    return recipes.find((r) => r.is_favorite) ?? recipes[0];
  }, [recipes]);

  const pantryShelf = useMemo(() => {
    if (!recipes || pantryNames.length === 0) return [];
    return [...recipes]
      .filter((r) => r.id !== heroRecipe?.id)
      .sort((a, b) => countMissing(a.ingredients) - countMissing(b.ingredients))
      .slice(0, 8);
  }, [recipes, pantryNames, countMissing, heroRecipe]);

  const topRatedShelf = useMemo(() => {
    if (!recipes) return [];
    return [...recipes]
      .filter((r) => r.id !== heroRecipe?.id && ratingByRecipeId.has(r.id))
      .sort((a, b) => (ratingByRecipeId.get(b.id) ?? 0) - (ratingByRecipeId.get(a.id) ?? 0))
      .slice(0, 8);
  }, [recipes, ratingByRecipeId, heroRecipe]);

  const activeFilterCount =
    (activeTag ? 1 : 0) +
    selectedDietary.length +
    (timeBucket ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (favoritesOnly ? 1 : 0);

  function resetFilters() {
    setActiveTag(null);
    setSelectedDietary([]);
    setTimeBucket(null);
    setMinRating(0);
    setFavoritesOnly(false);
  }

  function toggleDietary(tag: string) {
    setSelectedDietary((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function isTileActive(tile: CategoryTile): boolean {
    if (tile.kind === "dietary") return selectedDietary.includes(tile.tag);
    if (tile.kind === "time") return timeBucket === tile.bucket;
    if (tile.kind === "favorites") return favoritesOnly;
    return minRating === tile.threshold;
  }

  // Tiles act like cookbook chapters: tapping "ערב" after "בוקר" should
  // switch chapters, not require recipes tagged with both — so within a
  // tile's own group (meal type, kosher category, etc.) picking a new tag
  // replaces whatever was selected there instead of adding to it.
  function handleTileSelect(tile: CategoryTile) {
    if (tile.kind === "dietary") {
      setSelectedDietary((prev) => {
        const groupTags = DIETARY_TAG_GROUPS.find((g) => g.label === tile.group)?.options ?? [];
        const withoutGroup = prev.filter((t) => !groupTags.includes(t));
        return prev.includes(tile.tag) ? withoutGroup : [...withoutGroup, tile.tag];
      });
    } else if (tile.kind === "time") {
      setTimeBucket((prev) => (prev === tile.bucket ? null : tile.bucket));
    } else if (tile.kind === "favorites") {
      setFavoritesOnly((prev) => !prev);
    } else {
      setMinRating((prev) => (prev === tile.threshold ? 0 : tile.threshold));
    }
  }

  const filtered = useMemo(() => {
    if (!recipes) return [];
    const query = search.trim().toLowerCase();

    const matches = recipes.filter((recipe) => {
      const matchesSearch =
        !query ||
        recipe.title.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query) ||
        recipe.ingredients.some((i) => i.toLowerCase().includes(query)) ||
        recipe.instructions.some((i) => i.toLowerCase().includes(query));
      const matchesTag = !activeTag || recipe.tags.includes(activeTag);
      const matchesDietary = selectedDietary.every((d) => recipe.dietary_tags.includes(d));
      const matchesFavorite = !favoritesOnly || recipe.is_favorite;
      const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
      const matchesTime = !timeBucket || matchesTimeBucket(totalTime, timeBucket);
      const matchesRating = minRating === 0 || (ratingByRecipeId.get(recipe.id) ?? 0) >= minRating;
      return (
        matchesSearch &&
        matchesTag &&
        matchesDietary &&
        matchesFavorite &&
        matchesTime &&
        matchesRating
      );
    });

    if (!cookNowMode) return matches;

    return [...matches].sort(
      (a, b) => countMissing(a.ingredients) - countMissing(b.ingredients),
    );
  }, [
    recipes,
    search,
    activeTag,
    selectedDietary,
    favoritesOnly,
    timeBucket,
    minRating,
    ratingByRecipeId,
    cookNowMode,
    countMissing,
  ]);

  const isBrowsingUnfiltered =
    !search.trim() && activeFilterCount === 0 && !cookNowMode;

  const webQuery = useMemo(() => {
    const parts: string[] = [];
    if (search.trim()) parts.push(search.trim());
    if (activeTag) parts.push(activeTag);
    parts.push(...selectedDietary);
    const timeHint = timeBucket ? TIME_BUCKET_SEARCH_HINT[timeBucket] : undefined;
    if (timeHint) parts.push(timeHint);
    return parts.join(" ").trim();
  }, [search, activeTag, selectedDietary, timeBucket]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">מתכונים</h1>
        <p className="text-sm text-muted">
          האוסף המשותף שלכם, מסונכרן בזמן אמת.
        </p>
      </div>

      {!isLoading && (
        <CategoryTiles isActive={isTileActive} onSelect={handleTileSelect} />
      )}

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          {isBrowsingUnfiltered && heroRecipe && (
            <DashboardHero
              recipe={heroRecipe}
              eyebrow={heroRecipe.is_favorite ? "מהמועדפים שלכם" : "התווסף לאחרונה"}
            />
          )}

          {isBrowsingUnfiltered && (
            <RecipeShelf
              title="אפשר לבשל עכשיו 🍳"
              recipes={pantryShelf}
              badge={(r) => {
                const missing = countMissing(r.ingredients);
                return missing === 0 ? "יש לכם הכול!" : `חסרים ${missing}`;
              }}
            />
          )}

          {isBrowsingUnfiltered && (
            <RecipeShelf
              title="המדורגים ביותר ⭐"
              recipes={topRatedShelf}
              badge={(r) => {
                const rating = ratingByRecipeId.get(r.id);
                return rating ? `${rating.toFixed(1)}/10` : null;
              }}
            />
          )}
        </>
      )}

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש מתכונים..."
              className="ps-9"
            />
          </div>
          <button
            onClick={() => setCookNowMode((prev) => !prev)}
            title="מה אפשר לבשל עכשיו?"
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-lg border cursor-pointer transition-colors",
              cookNowMode
                ? "border-success bg-success/15 text-success"
                : "border-border text-muted hover:bg-surface-2",
            )}
          >
            <ChefHat className="size-4" />
          </button>
          <button
            onClick={() => setFavoritesOnly((prev) => !prev)}
            title="מועדפים בלבד"
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-lg border cursor-pointer transition-colors",
              favoritesOnly
                ? "border-danger bg-danger/15 text-danger"
                : "border-border text-muted hover:bg-surface-2",
            )}
          >
            <Heart className={cn("size-4", favoritesOnly && "fill-danger")} />
          </button>
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            title="מה מכינים היום?"
            className={cn(
              "relative flex size-11 shrink-0 items-center justify-center rounded-lg border cursor-pointer transition-colors",
              showFilters || activeFilterCount > 0
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-muted hover:bg-surface-2",
            )}
          >
            <SlidersHorizontal className="size-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -end-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="space-y-3 rounded-xl border border-border bg-surface p-3.5">
            <div className="flex items-center justify-between">
              <p className="font-serif text-base font-bold text-foreground">מה מכינים היום?</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  נקו סינון ({activeFilterCount})
                </button>
              )}
            </div>

            {tags.length > 0 && (
              <FilterRow label="תגית">
                <Badge active={activeTag === null} onClick={() => setActiveTag(null)}>
                  הכול
                </Badge>
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    active={activeTag === tag}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </FilterRow>
            )}

            <FilterRow label="זמן הכנה">
              {TIME_BUCKETS.map(({ value, label }) => (
                <Badge
                  key={value}
                  active={timeBucket === value}
                  onClick={() => setTimeBucket(timeBucket === value ? null : value)}
                >
                  {label}
                </Badge>
              ))}
            </FilterRow>

            <FilterRow label="דירוג מינימלי">
              <div className="flex items-center gap-1">
                {[2, 4, 6, 8, 10].map((threshold, i) => (
                  <button
                    key={threshold}
                    onClick={() => setMinRating(minRating === threshold ? 0 : threshold)}
                    className="cursor-pointer p-0.5"
                  >
                    <Star
                      className={cn(
                        "size-5",
                        minRating >= threshold ? "fill-accent text-accent" : "text-border",
                      )}
                    />
                    <span className="sr-only">{i + 1} כוכבים ומעלה</span>
                  </button>
                ))}
              </div>
            </FilterRow>

            {DIETARY_TAG_GROUPS.map((group) => (
              <FilterRow key={group.label} label={group.label}>
                {group.options.map((tag) => (
                  <Badge
                    key={tag}
                    active={selectedDietary.includes(tag)}
                    onClick={() => toggleDietary(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </FilterRow>
            ))}
          </div>
        )}
      </div>

      {!isLoading && filtered.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="font-serif text-lg font-bold text-foreground">
            {isBrowsingUnfiltered ? "כל המתכונים" : `${filtered.length} התאמות`}
          </p>
          {!isBrowsingUnfiltered && !showFilters && activeFilterCount > 0 && (
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground cursor-pointer"
            >
              <ChevronDown className="size-3.5" />
              הצג סינון
            </button>
          )}
        </div>
      )}

      {cookNowMode && !isLoading && filtered.length > 0 && (
        <p className="flex items-center gap-1.5 text-sm text-success">
          <ChefHat className="size-4 shrink-0" />
          ממוין לפי הכי פחות מרכיבים חסרים מהמזווה שלכם.
        </p>
      )}

      {isLoading ? null : filtered.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            icon={favoritesOnly ? Heart : UtensilsCrossed}
            title={
              recipes?.length
                ? favoritesOnly
                  ? "אין עדיין מתכונים מועדפים"
                  : "לא נמצאו מתכונים תואמים"
                : "עדיין אין מתכונים"
            }
            description={
              recipes?.length
                ? favoritesOnly
                  ? "לחצו על הלב במתכון כדי להוסיף אותו למועדפים."
                  : "נסו לשנות או לנקות את הסינון, או חפשו הצעה למטה."
                : "הוסיפו את המתכון הראשון שלכם כדי להתחיל."
            }
          />
          {webQuery && <WebRecipeSuggestions key={webQuery} query={webQuery} />}
        </div>
      ) : isBrowsingUnfiltered ? (
        <CategorizedRecipeGrid recipes={filtered} />
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              missingCount={cookNowMode ? countMissing(recipe.ingredients) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [&>*]:shrink-0">
        {children}
      </div>
    </div>
  );
}
