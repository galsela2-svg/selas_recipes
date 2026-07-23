"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Beef,
  CakeSlice,
  ChefHat,
  ChevronDown,
  Clock,
  ClockFading,
  CookingPot,
  Croissant,
  Dessert,
  Dices,
  Drumstick,
  Dumbbell,
  EggFried,
  ExternalLink,
  Flame,
  Globe,
  Hamburger,
  Heart,
  LayoutGrid,
  Leaf,
  Loader2,
  Meh,
  Milk,
  Pizza,
  RotateCcw,
  Salad,
  Sandwich,
  Scale,
  Search,
  SlidersHorizontal,
  Smile,
  Soup,
  Star,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useRecipes, useCreateRecipe } from "@/lib/queries/recipes";
import { useTags } from "@/lib/queries/tags";
import { useAllCookLogs } from "@/lib/queries/cook-logs";
import { usePantryItems, isIngredientInPantry } from "@/lib/queries/pantry";
import { DIETARY_TAG_GROUPS, RECIPE_OWNERS, type ParsedRecipe, type RecipeOwner } from "@/lib/types";
import { buildDiscoveryQuery } from "@/lib/taste-profile";
import { useDefaultOwner } from "@/lib/default-owner";
import { useToast } from "@/components/providers/toast-provider";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { RecipeShelf } from "@/components/dashboard/recipe-shelf";
import { CategoryTiles, CATEGORY_TILES, type CategoryTile } from "@/components/dashboard/category-tiles";
import { CategorizedRecipeGrid } from "@/components/dashboard/categorized-recipe-grid";
import { WebRecipeSuggestions } from "@/components/dashboard/web-recipe-suggestions";
import { ImportableRecipeCard } from "@/components/search/importable-recipe-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

// Category tiles above the filter drawer are shortcuts into specific
// dietary tags / time buckets — computed once here (both inputs are static
// module constants) so the drawer below can skip re-listing whichever ones
// already have a tile, instead of showing the same category twice.
const TILE_DIETARY_TAGS = new Set(
  CATEGORY_TILES.filter((t) => t.kind === "dietary").map((t) => `${t.group}:${t.tag}`),
);
const FILTER_DIETARY_GROUPS = DIETARY_TAG_GROUPS.map((group) => ({
  label: group.label,
  options: group.options.filter((tag) => !TILE_DIETARY_TAGS.has(`${group.label}:${tag}`)),
})).filter((group) => group.options.length > 0);

const TILE_TIME_BUCKETS = new Set<TimeBucket>(
  CATEGORY_TILES.filter((t) => t.kind === "time").map((t) => t.bucket),
);
const FILTER_TIME_BUCKETS = TIME_BUCKETS.filter(({ value }) => !TILE_TIME_BUCKETS.has(value));

// Only "short" has a search-friendly translation — "medium"/"long" don't
// map to a phrase people actually search recipe sites for.
const TIME_BUCKET_SEARCH_HINT: Partial<Record<TimeBucket, string>> = {
  short: "מהיר וקל",
};

// Quick-filter chips for the "web only" search mode — these build a free
// text query rather than filtering the local collection (see CATEGORY_TILES
// for that), so they can be broader/looser than the structured dietary tags.
type Token = { icon: LucideIcon; label: string };

const TOKEN_GROUPS: { label: string; tokens: Token[] }[] = [
  {
    label: "סוג מנה",
    tokens: [
      { icon: CakeSlice, label: "עוגות" },
      { icon: Croissant, label: "מאפים" },
      { icon: UtensilsCrossed, label: "פסטה" },
      { icon: Soup, label: "מרקים" },
      { icon: Salad, label: "סלטים" },
      { icon: Drumstick, label: "עוף" },
      { icon: Dessert, label: "קינוחים" },
      { icon: Leaf, label: "צמחוני" },
      { icon: Zap, label: "מהיר וקל" },
    ],
  },
  {
    label: "סגנון אוכל",
    tokens: [
      { icon: Pizza, label: "איטלקי" },
      { icon: Soup, label: "אסייתי" },
      { icon: Hamburger, label: "אמריקאי" },
      { icon: Flame, label: "מקסיקני" },
      { icon: CookingPot, label: "הודי" },
      { icon: Soup, label: "תאילנדי" },
      { icon: Salad, label: "יווני" },
      { icon: CookingPot, label: "מרוקאי" },
      { icon: Croissant, label: "צרפתי" },
      { icon: Sandwich, label: "מזרח תיכוני" },
    ],
  },
  {
    label: "זמן הכנה",
    tokens: [
      { icon: Zap, label: "מהיר" },
      { icon: Clock, label: "תוך שעה" },
      { icon: ClockFading, label: "בישול איטי" },
    ],
  },
  {
    label: "רמת קושי",
    tokens: [
      { icon: Smile, label: "קל להכנה" },
      { icon: Meh, label: "רמת קושי בינונית" },
      { icon: Dumbbell, label: "מתכון מאתגר" },
    ],
  },
  {
    label: "כשרות",
    tokens: [
      { icon: Beef, label: "בשרי" },
      { icon: Milk, label: "חלבי" },
      { icon: Scale, label: "פרווה" },
    ],
  },
  {
    label: "סוג ארוחה",
    tokens: [
      { icon: EggFried, label: "ארוחת בוקר" },
      { icon: Sandwich, label: "ארוחת צהריים" },
      { icon: UtensilsCrossed, label: "ארוחת ערב" },
      { icon: Dessert, label: "קינוח" },
    ],
  },
];

// Flat design: the color lives only in the icon (solid fill + solid
// stroke) — no badge/circle behind it. Cycles through a small palette by a
// stable hash of the label instead of hand-mapping ~35 tokens.
const TOKEN_COLOR_PALETTE: string[] = [
  "#b91c1c",
  "#c2410c",
  "#b45309",
  "#15803d",
  "#2563eb",
  "#6d28d9",
  "#db2777",
  "#0284c7",
];

function colorForLabel(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0;
  return TOKEN_COLOR_PALETTE[Math.abs(hash) % TOKEN_COLOR_PALETTE.length];
}

type WebSearchResult = { title: string; url: string; snippet: string };
type SearchResponse = { recipes: ParsedRecipe[]; links: WebSearchResult[] };

export default function DashboardPage() {
  const [mode, setMode] = useState<"collection" | "web">("collection");
  const { data: recipes, isLoading } = useRecipes();
  const { data: pantryItems } = usePantryItems();
  const { data: cookLogs } = useAllCookLogs();
  const tags = useTags();
  const [search, setSearch] = useState("");
  const [ingredientQuery, setIngredientQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [timeBucket, setTimeBucket] = useState<TimeBucket | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<RecipeOwner | null>(null);
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

  const pantryShelf = useMemo(() => {
    if (!recipes || pantryNames.length === 0) return [];
    return [...recipes]
      .sort((a, b) => countMissing(a.ingredients) - countMissing(b.ingredients))
      .slice(0, 8);
  }, [recipes, pantryNames, countMissing]);

  const topRatedShelf = useMemo(() => {
    if (!recipes) return [];
    return [...recipes]
      .filter((r) => ratingByRecipeId.has(r.id))
      .sort((a, b) => (ratingByRecipeId.get(b.id) ?? 0) - (ratingByRecipeId.get(a.id) ?? 0))
      .slice(0, 8);
  }, [recipes, ratingByRecipeId]);

  const activeFilterCount =
    (activeTag ? 1 : 0) +
    selectedDietary.length +
    (timeBucket ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (favoritesOnly ? 1 : 0) +
    (ingredientQuery.trim() ? 1 : 0) +
    (ownerFilter ? 1 : 0);

  function resetFilters() {
    setActiveTag(null);
    setSelectedDietary([]);
    setTimeBucket(null);
    setMinRating(0);
    setFavoritesOnly(false);
    setIngredientQuery("");
    setOwnerFilter(null);
  }

  function toggleDietary(tag: string) {
    setSelectedDietary((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function isTileActive(tile: CategoryTile): boolean {
    if (tile.kind === "dietary") return selectedDietary.includes(tile.tag);
    if (tile.kind === "time") return timeBucket === tile.bucket;
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
    } else {
      setMinRating((prev) => (prev === tile.threshold ? 0 : tile.threshold));
    }
  }

  const filtered = useMemo(() => {
    if (!recipes) return [];
    const query = search.trim().toLowerCase();
    const ingredientNeedle = ingredientQuery.trim().toLowerCase();

    const matches = recipes.filter((recipe) => {
      const matchesSearch =
        !query ||
        recipe.title.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query) ||
        recipe.ingredients.some((i) => i.toLowerCase().includes(query)) ||
        recipe.instructions.some((i) => i.toLowerCase().includes(query));
      const matchesIngredient =
        !ingredientNeedle ||
        recipe.ingredients.some((i) => i.toLowerCase().includes(ingredientNeedle));
      const matchesTag = !activeTag || recipe.tags.includes(activeTag);
      const matchesDietary = selectedDietary.every((d) => recipe.dietary_tags.includes(d));
      const matchesFavorite = !favoritesOnly || recipe.is_favorite;
      const matchesOwner = !ownerFilter || recipe.made_by === ownerFilter;
      const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
      const matchesTime = !timeBucket || matchesTimeBucket(totalTime, timeBucket);
      const matchesRating = minRating === 0 || (ratingByRecipeId.get(recipe.id) ?? 0) >= minRating;
      return (
        matchesSearch &&
        matchesIngredient &&
        matchesTag &&
        matchesDietary &&
        matchesFavorite &&
        matchesOwner &&
        matchesTime &&
        matchesRating
      );
    });

    return matches;
  }, [
    recipes,
    search,
    ingredientQuery,
    activeTag,
    selectedDietary,
    favoritesOnly,
    ownerFilter,
    timeBucket,
    minRating,
    ratingByRecipeId,
  ]);

  const isBrowsingUnfiltered = !search.trim() && activeFilterCount === 0;

  const webQuery = useMemo(() => {
    const parts: string[] = [];
    if (search.trim()) parts.push(search.trim());
    if (ingredientQuery.trim()) parts.push(ingredientQuery.trim());
    if (activeTag) parts.push(activeTag);
    parts.push(...selectedDietary);
    const timeHint = timeBucket ? TIME_BUCKET_SEARCH_HINT[timeBucket] : undefined;
    if (timeHint) parts.push(timeHint);
    return parts.join(" ").trim();
  }, [search, ingredientQuery, activeTag, selectedDietary, timeBucket]);

  // Web suggestions matching the same requirements show up whenever the
  // local collection doesn't have much to offer — not only when it's
  // completely empty — so "no great match yet" never dead-ends.
  const showWebSuggestions = !isLoading && webQuery && filtered.length < 3;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface p-1">
        <button
          onClick={() => setMode("collection")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium cursor-pointer transition-colors",
            mode === "collection" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground",
          )}
        >
          <LayoutGrid className="size-4" />
          האוסף שלי
        </button>
        <button
          onClick={() => setMode("web")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium cursor-pointer transition-colors",
            mode === "web" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground",
          )}
        >
          <Globe className="size-4" />
          חיפוש באינטרנט
        </button>
      </div>

      {mode === "web" ? (
        <WebSearchMode />
      ) : (
        <>
          {!isLoading && <CategoryTiles isActive={isTileActive} onSelect={handleTileSelect} />}

          {isLoading ? (
            <Spinner />
          ) : (
            <>
              {isBrowsingUnfiltered && (
                <RecipeShelf
                  title="אפשר לבשל עכשיו"
                  icon={ChefHat}
                  recipes={pantryShelf}
                  badge={(r) => {
                    const missing = countMissing(r.ingredients);
                    return missing === 0 ? "יש לכם הכול!" : `חסרים ${missing}`;
                  }}
                />
              )}

              {isBrowsingUnfiltered && (
                <RecipeShelf
                  title="המדורגים ביותר"
                  icon={Star}
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
                  placeholder="חיפוש במתכונים שלכם..."
                  className="ps-9"
                />
              </div>
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

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted">סינון לפי מצרך ספציפי</p>
                  <Input
                    value={ingredientQuery}
                    onChange={(e) => setIngredientQuery(e.target.value)}
                    placeholder="רק מתכונים שמכילים... לדוגמה: לימון"
                  />
                </div>

                <FilterRow label="מי הכין/ה">
                  <Badge active={ownerFilter === null} onClick={() => setOwnerFilter(null)}>
                    הכול
                  </Badge>
                  {RECIPE_OWNERS.map((owner) => (
                    <Badge
                      key={owner}
                      active={ownerFilter === owner}
                      onClick={() => setOwnerFilter(ownerFilter === owner ? null : owner)}
                    >
                      {owner}
                    </Badge>
                  ))}
                </FilterRow>

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

                {FILTER_TIME_BUCKETS.length > 0 && (
                  <FilterRow label="זמן הכנה">
                    {FILTER_TIME_BUCKETS.map(({ value, label }) => (
                      <Badge
                        key={value}
                        active={timeBucket === value}
                        onClick={() => setTimeBucket(timeBucket === value ? null : value)}
                      >
                        {label}
                      </Badge>
                    ))}
                  </FilterRow>
                )}

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

                {FILTER_DIETARY_GROUPS.map((group) => (
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

          {isLoading ? null : filtered.length === 0 ? (
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
          ) : isBrowsingUnfiltered ? (
            <CategorizedRecipeGrid recipes={filtered} />
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {filtered.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}

          {showWebSuggestions && <WebRecipeSuggestions key={webQuery} query={webQuery} />}
        </>
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

/** Pure web search — no dependency on the local collection. Same rich
 * quick-filter tokens and "אולי תאהבו" discovery that used to live on the
 * standalone /search page, folded into the unified tab. */
function WebSearchMode() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: myRecipes, isLoading: myRecipesLoading } = useRecipes();
  const createRecipe = useCreateRecipe();
  const defaultOwner = useDefaultOwner();
  const [savingUrl, setSavingUrl] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [importingUrl, setImportingUrl] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<SearchResponse | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const hasFetchedSuggestions = useRef(false);

  useEffect(() => {
    if (myRecipesLoading || hasFetchedSuggestions.current) return;
    hasFetchedSuggestions.current = true;

    let cancelled = false;
    setSuggestionsLoading(true);
    setSuggestionsError(null);

    const q = buildDiscoveryQuery(myRecipes);
    fetch(`/api/search-recipes?q=${encodeURIComponent(q)}`)
      .then(async (res) => ({ ok: res.ok, body: await res.json() }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) throw new Error(body.error || "לא הצלחנו למצוא הצעות.");
        setSuggestions(body as SearchResponse);
      })
      .catch((err) => {
        if (!cancelled) {
          setSuggestionsError(err instanceof Error ? err.message : "משהו השתבש.");
        }
      })
      .finally(() => {
        if (!cancelled) setSuggestionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [myRecipesLoading, myRecipes]);

  async function refreshSuggestions() {
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const q = buildDiscoveryQuery(myRecipes);
      const res = await fetch(`/api/search-recipes?q=${encodeURIComponent(q)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "לא הצלחנו למצוא הצעות.");
      setSuggestions(body as SearchResponse);
    } catch (err) {
      setSuggestionsError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setSuggestionsLoading(false);
    }
  }

  async function performSearch(term: string) {
    if (!term.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/search-recipes?q=${encodeURIComponent(term.trim())}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "החיפוש נכשל.");
      setResult(body as SearchResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    performSearch(query);
  }

  function toggleToken(token: string) {
    setQuery((prev) => {
      const words = prev.split(/\s+/).filter(Boolean);
      const tokenWords = token.split(/\s+/);
      const has = tokenWords.every((w) => words.includes(w));
      if (has) {
        return words.filter((w) => !tokenWords.includes(w)).join(" ");
      }
      return [...words, ...tokenWords].join(" ");
    });
  }

  function isTokenActive(token: string): boolean {
    const words = query.split(/\s+/).filter(Boolean);
    return token.split(/\s+/).every((w) => words.includes(w));
  }

  // "Import" saves the recipe straight to the collection and lands you on
  // it, with a toast confirming it was added — no separate review step.
  function saveRecipe(recipe: ParsedRecipe) {
    setSavingUrl(recipe.source_url);
    createRecipe.mutate(
      {
        title: recipe.title,
        description: recipe.description,
        image_url: recipe.image_url,
        source_url: recipe.source_url,
        prep_time_minutes: recipe.prep_time_minutes,
        cook_time_minutes: recipe.cook_time_minutes,
        servings: recipe.servings,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        tags: [],
        dietary_tags: [],
        made_by: defaultOwner,
      },
      {
        onSuccess: (saved) => {
          showToast(`"${saved.title}" נוסף למתכונים שלכם!`);
          router.push(`/recipes/${saved.id}`);
        },
        onError: () => setError("לא הצלחנו לשמור את המתכון. נסו שוב."),
        onSettled: () => setSavingUrl(null),
      },
    );
  }

  async function importFromLink(link: WebSearchResult) {
    setImportingUrl(link.url);
    setError(null);
    try {
      const res = await fetch("/api/parse-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link.url }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "לא הצלחנו לפענח את הדף הזה.");
      saveRecipe(body as ParsedRecipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setImportingUrl(null);
    }
  }

  const hasSearched = result !== null;
  const totalResults = (result?.recipes.length ?? 0) + (result?.links.length ?? 0);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="לדוגמה: עוגת שוקולד, פסטה ברוטב שמנת..."
          className="flex-1"
        />
        <Button type="submit" loading={loading}>
          <Search className="size-4" />
        </Button>
      </form>

      <div className="space-y-3">
        {TOKEN_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <p className="text-xs font-medium text-muted">{group.label}</p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
              {group.tokens.map(({ icon: Icon, label }) => {
                const active = isTokenActive(label);
                const color = colorForLabel(label);
                return (
                  <button
                    key={label}
                    onClick={() => toggleToken(label)}
                    className={
                      "flex shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-2 text-xs font-medium transition-colors cursor-pointer " +
                      (active
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-surface text-muted hover:border-accent/50 hover:text-foreground")
                    }
                  >
                    <Icon
                      className="size-5"
                      strokeWidth={1.75}
                      style={{ color, fill: color, fillOpacity: 0.35 }}
                    />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading && (
        <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted">
          <Loader2 className="size-6 animate-spin" />
          מחפשים ובודקים מתכונים ברשת...
        </div>
      )}

      {hasSearched && !loading && totalResults === 0 && (
        <EmptyState
          icon={Search}
          title="לא נמצאו תוצאות"
          description="נסו נושא אחר או ניסוח שונה."
        />
      )}

      {!hasSearched && !loading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 font-serif text-lg font-bold text-foreground">
              <Dices className="size-5 text-accent" />
              אולי תאהבו
            </p>
            <button
              onClick={refreshSuggestions}
              disabled={suggestionsLoading}
              className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground cursor-pointer disabled:opacity-50"
            >
              <Dices className="size-3.5" />
              הפתיעו אותי שוב
            </button>
          </div>
          <p className="text-xs text-muted">
            הצעות מהאינטרנט לפי מה שאתם בדרך כלל מבשלים — עד שתחפשו משהו ספציפי.
          </p>

          {suggestionsLoading && (
            <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted">
              <Loader2 className="size-5 animate-spin" />
              מחפשים הצעות בשבילכם...
            </div>
          )}

          {suggestionsError && <p className="text-sm text-danger">{suggestionsError}</p>}

          {!suggestionsLoading && suggestions && suggestions.recipes.length > 0 && (
            <div className="flex flex-col gap-3">
              {suggestions.recipes.map((recipe) => (
                <ImportableRecipeCard
                  key={recipe.source_url}
                  recipe={recipe}
                  onImport={saveRecipe}
                  saving={savingUrl === recipe.source_url}
                />
              ))}
            </div>
          )}

          {!suggestionsLoading &&
            suggestions &&
            suggestions.recipes.length === 0 &&
            suggestions.links.length === 0 && (
              <p className="py-4 text-center text-sm text-muted">
                לא הצלחנו למצוא הצעה הפעם — נסו &quot;הפתיעו אותי שוב&quot; או חפשו נושא ספציפי.
              </p>
            )}
        </div>
      )}

      {result && result.recipes.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            מתכונים מוכנים לייבוא
          </p>
          <div className="flex flex-col gap-3">
            {result.recipes.map((recipe) => (
              <ImportableRecipeCard
                key={recipe.source_url}
                recipe={recipe}
                onImport={saveRecipe}
                saving={savingUrl === recipe.source_url}
              />
            ))}
          </div>
        </div>
      )}

      {result && result.links.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            תוצאות נוספות
          </p>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {result.links.map((link) => (
              <li key={link.url} className="flex items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">
                    {link.title}
                  </p>
                  {link.snippet && (
                    <p className="line-clamp-1 text-xs text-muted">{link.snippet}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={importingUrl === link.url}
                  onClick={() => importFromLink(link)}
                >
                  ייבוא
                </Button>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground"
                >
                  <ExternalLink className="size-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
