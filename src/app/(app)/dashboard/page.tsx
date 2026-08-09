"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Heart, Pencil, Search, Tag, Trash2, UtensilsCrossed } from "lucide-react";
import { useRecipes, useDeleteRecipe } from "@/lib/queries/recipes";
import { useFamilyMembers } from "@/lib/queries/family";
import { DIETARY_TAG_GROUPS } from "@/lib/types";
import type { CategoryTile } from "@/lib/quick-filter-tiles";
import { useSettings } from "@/components/providers/settings-provider";
import { useBackfillMissingCoverImages } from "@/lib/use-backfill-cover-images";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { CategorizedRecipeGrid } from "@/components/dashboard/categorized-recipe-grid";
import { CategoryTiles } from "@/components/dashboard/category-tiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { data: recipes, isLoading } = useRecipes();
  const { data: familyMembers } = useFamilyMembers();
  const [settings, setSetting] = useSettings();
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [showCategoryTiles, setShowCategoryTiles] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const searchParams = useSearchParams();
  // Landing here right after saving a recipe (?highlight=<id>) scrolls to
  // and briefly rings that card, so "save" visibly lands you on the recipe
  // in its place in the collection instead of just a toast. Seeded once from
  // the URL, then cleared locally once the highlight has played.
  const [highlightedId, setHighlightedId] = useState<string | null>(() =>
    searchParams.get("highlight"),
  );
  const deleteRecipe = useDeleteRecipe();

  useBackfillMissingCoverImages(recipes);

  useEffect(() => {
    if (!highlightedId || isLoading) return;
    const el = document.getElementById(`recipe-${highlightedId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timeout = setTimeout(() => {
      setHighlightedId(null);
      window.history.replaceState(null, "", "/dashboard");
    }, 2500);
    return () => clearTimeout(timeout);
  }, [highlightedId, isLoading, recipes]);

  function toggleSelectionMode() {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => deleteRecipe.mutateAsync(id)));
      setConfirmBulkDelete(false);
      setSelectionMode(false);
      setSelectedIds(new Set());
    } finally {
      setBulkDeleting(false);
    }
  }

  function isTileActive(tile: CategoryTile): boolean {
    return selectedDietary.includes(tile.tag);
  }

  // Tiles act like cookbook chapters: tapping "ערב" after "בוקר" should
  // switch chapters, not require recipes tagged with both — so within a
  // tile's own group (meal type, kosher category, etc.) picking a new tag
  // replaces whatever was selected there instead of adding to it.
  function handleTileSelect(tile: CategoryTile) {
    setSelectedDietary((prev) => {
      const groupTags = DIETARY_TAG_GROUPS.find((g) => g.label === tile.group)?.options ?? [];
      const withoutGroup = prev.filter((t) => !groupTags.includes(t));
      return prev.includes(tile.tag) ? withoutGroup : [...withoutGroup, tile.tag];
    });
  }

  // One smart search box covers everything: a dish name, an ingredient, or
  // a category word (dietary tag, meal type, cuisine, etc.) — no separate
  // filter UI to learn. Category tokens below are a tap-friendly shortcut
  // for the same dietary_tags a search word would already match.
  const filtered = useMemo(() => {
    if (!recipes) return [];
    const query = search.trim().toLowerCase();

    return recipes.filter((recipe) => {
      const matchesSearch =
        !query ||
        recipe.title.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query) ||
        recipe.ingredients.some((i) => i.toLowerCase().includes(query)) ||
        recipe.tags.some((t) => t.toLowerCase().includes(query)) ||
        recipe.dietary_tags.some((t) => t.toLowerCase().includes(query));
      const matchesFavorite = !favoritesOnly || recipe.is_favorite;
      const matchesOwner = !ownerFilter || recipe.made_by_user_id === ownerFilter;
      const matchesDietary = selectedDietary.every((d) => recipe.dietary_tags.includes(d));
      return matchesSearch && matchesFavorite && matchesOwner && matchesDietary;
    });
  }, [recipes, search, favoritesOnly, ownerFilter, selectedDietary]);

  const isBrowsingUnfiltered =
    !search.trim() && !favoritesOnly && !ownerFilter && selectedDietary.length === 0;

  return (
    <div className="space-y-6">
      {familyMembers && familyMembers.length > 1 && (
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface p-1">
          <button
            onClick={() => setOwnerFilter(null)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium cursor-pointer transition-colors",
              ownerFilter === null ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground",
            )}
          >
            הכול
          </button>
          {familyMembers.map((member) => (
            <button
              key={member.user_id}
              onClick={() => setOwnerFilter(ownerFilter === member.user_id ? null : member.user_id)}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-medium cursor-pointer transition-colors",
                ownerFilter === member.user_id
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:text-foreground",
              )}
            >
              {member.display_name}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש לפי שם, קטגוריה או מרכיב..."
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
              onClick={() => setShowCategoryTiles((prev) => !prev)}
              title="קטגוריות"
              className={cn(
                "relative flex size-11 shrink-0 items-center justify-center rounded-lg border cursor-pointer transition-colors",
                showCategoryTiles || selectedDietary.length > 0
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted hover:bg-surface-2",
              )}
            >
              <Tag className="size-4" />
              {selectedDietary.length > 0 && (
                <span className="absolute -top-1 -end-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                  {selectedDietary.length}
                </span>
              )}
            </button>
          </div>

          {showCategoryTiles && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted">קטגוריות</p>
                <button
                  onClick={() => setShowCategoryTiles(false)}
                  className="flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground cursor-pointer"
                >
                  <ChevronDown className="size-3.5" />
                  מזעור
                </button>
              </div>
              <CategoryTiles
                tileKeys={settings.quickFilterTileKeys}
                onTileKeysChange={(keys) => setSetting("quickFilterTileKeys", keys)}
                isActive={isTileActive}
                onSelect={handleTileSelect}
              />
              {selectedDietary.length > 0 && (
                <button
                  onClick={() => setSelectedDietary([])}
                  className="text-xs font-medium text-muted hover:text-foreground cursor-pointer"
                >
                  ניקוי קטגוריות ({selectedDietary.length})
                </button>
              )}
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="font-serif text-lg font-bold text-foreground">
                {isBrowsingUnfiltered ? "כל המתכונים" : `${filtered.length} התאמות`}
              </p>
              <button
                onClick={toggleSelectionMode}
                title="עריכת מתכונים"
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg border cursor-pointer transition-colors",
                  selectionMode
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border text-muted hover:bg-surface-2",
                )}
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
          )}

          {selectionMode && (
            <div className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent/10 px-3.5 py-2.5">
              <p className="text-sm font-medium text-foreground">
                {selectedIds.size > 0 ? `נבחרו ${selectedIds.size}` : "בחרו מתכונים למחיקה"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectionMode}
                  className="text-xs font-medium text-muted hover:text-foreground cursor-pointer"
                >
                  ביטול
                </button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={selectedIds.size === 0}
                  onClick={() => setConfirmBulkDelete(true)}
                >
                  <Trash2 className="size-3.5" />
                  מחיקה
                </Button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
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
                    : "נסו לשנות או לנקות את החיפוש/הקטגוריות."
                  : "הוסיפו את המתכון הראשון שלכם כדי להתחיל."
              }
            />
          ) : isBrowsingUnfiltered ? (
            <CategorizedRecipeGrid
              recipes={filtered}
              selectedIds={selectionMode ? selectedIds : undefined}
              onToggleSelect={toggleSelected}
              highlightedId={highlightedId}
            />
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {filtered.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  selectable={selectionMode}
                  selected={selectedIds.has(recipe.id)}
                  onToggleSelect={() => toggleSelected(recipe.id)}
                  highlighted={recipe.id === highlightedId}
                />
              ))}
            </div>
          )}

          <Modal
            open={confirmBulkDelete}
            onClose={() => setConfirmBulkDelete(false)}
            title="למחוק את המתכונים שנבחרו?"
          >
            <p className="mb-4 text-sm text-muted">
              הפעולה תמחק לצמיתות {selectedIds.size} מתכונים. לא ניתן לבטל פעולה זו.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmBulkDelete(false)}>
                ביטול
              </Button>
              <Button variant="danger" onClick={handleBulkDelete} loading={bulkDeleting}>
                מחיקה
              </Button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
