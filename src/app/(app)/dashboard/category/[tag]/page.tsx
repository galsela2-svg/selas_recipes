"use client";

import { use, useMemo, useState } from "react";
import { ArrowUpDown, BookOpen, Search } from "lucide-react";
import { useRecipes } from "@/lib/queries/recipes";
import { useSettings } from "@/components/providers/settings-provider";
import { useOwnerFilter } from "@/components/providers/owner-filter-provider";
import { DASHBOARD_ALL_SCOPE, getDashboardCategories } from "@/lib/settings-store";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { getCategoryIcon } from "@/lib/quick-filter-tiles";
import { OTHER_CATEGORY_SLUG } from "@/lib/meal-type-sections";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/lib/types";

type SortKey = "newest" | "time" | "difficulty" | "ingredients" | "alpha";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "החדשים ביותר" },
  { key: "time", label: "זמן הכנה" },
  { key: "difficulty", label: "רמת קושי" },
  { key: "ingredients", label: "מספר מרכיבים" },
  { key: "alpha", label: "לפי א-ב" },
];

// Matches the "רמת קושי" dietary-tag group (src/lib/types.ts) — recipes
// without any of these tags sort after every ranked one, not before, so
// "sort by difficulty" doesn't just become "untagged recipes first".
const DIFFICULTY_RANK: Record<string, number> = {
  "קל להכנה": 0,
  "רמת קושי בינונית": 1,
  "מתכון מאתגר": 2,
};

function difficultyRank(recipe: Recipe): number {
  const tag = recipe.dietary_tags.find((t) => t in DIFFICULTY_RANK);
  return tag ? DIFFICULTY_RANK[tag] : DIFFICULTY_RANK["מתכון מאתגר"] + 1;
}

function totalTime(recipe: Recipe): number {
  return (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
}

export default function CategoryPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: rawTag } = use(params);
  const tag = decodeURIComponent(rawTag);
  const isOther = rawTag === OTHER_CATEGORY_SLUG;

  const { data: recipes, isLoading } = useRecipes();
  const [settings] = useSettings();
  const { ownerFilter } = useOwnerFilter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const label = isOther ? "מתכונים נוספים" : tag;
  const dashboardCategories = getDashboardCategories(settings, ownerFilter ?? DASHBOARD_ALL_SCOPE);

  const categoryRecipes = useMemo(() => {
    if (!recipes) return [];
    if (isOther) {
      return recipes.filter((r) => !dashboardCategories.some((t) => r.dietary_tags.includes(t)));
    }
    return recipes.filter((r) => r.dietary_tags.includes(tag));
  }, [recipes, tag, isOther, dashboardCategories]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = !query
      ? categoryRecipes
      : categoryRecipes.filter(
          (r) =>
            r.title.toLowerCase().includes(query) ||
            r.description?.toLowerCase().includes(query) ||
            r.ingredients.some((i) => i.toLowerCase().includes(query)),
        );

    const sorted = [...list];
    switch (sort) {
      case "time":
        sorted.sort((a, b) => totalTime(a) - totalTime(b));
        break;
      case "difficulty":
        sorted.sort((a, b) => difficultyRank(a) - difficultyRank(b));
        break;
      case "ingredients":
        sorted.sort((a, b) => a.ingredients.length - b.ingredients.length);
        break;
      case "alpha":
        sorted.sort((a, b) => a.title.localeCompare(b.title, "he"));
        break;
      case "newest":
      default:
        sorted.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
    return sorted;
  }, [categoryRecipes, search, sort]);

  if (isLoading) return <Spinner />;

  const Icon = isOther ? BookOpen : getCategoryIcon(tag);

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-1.5 font-serif text-xl font-bold text-foreground">
        {/* getCategoryIcon always resolves to one of a fixed set of
            already-defined icon components (a lookup, never a fresh
            component definition), so this doesn't have the state-reset
            hazard the lint rule guards against. */}
        {/* eslint-disable-next-line react-hooks/static-components */}
        <Icon className="size-5 shrink-0 text-accent" />
        {label}
      </p>

      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם או מרכיב..."
          className="ps-9"
        />
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <ArrowUpDown className="size-3.5 shrink-0 text-muted" />
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSort(opt.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors",
              sort === opt.key
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-muted hover:border-accent/50",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Icon} title="לא נמצאו מתכונים" description="נסו לשנות את החיפוש." />
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
