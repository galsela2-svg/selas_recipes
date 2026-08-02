"use client";

import { useMemo, useState } from "react";
import { Heart, Pencil, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { useRecipes, useDeleteRecipe } from "@/lib/queries/recipes";
import type { RecipeOwner } from "@/lib/types";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { CategorizedRecipeGrid } from "@/components/dashboard/categorized-recipe-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const OWNER_FILTERS: RecipeOwner[] = ["ניבה", "גל"];

export default function DashboardPage() {
  const { data: recipes, isLoading } = useRecipes();
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<RecipeOwner | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const deleteRecipe = useDeleteRecipe();

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

  // One smart search box covers everything: a dish name, an ingredient, or
  // a category word (dietary tag, meal type, cuisine, etc.) — no separate
  // filter UI to learn.
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
      const matchesOwner = !ownerFilter || recipe.made_by === ownerFilter;
      return matchesSearch && matchesFavorite && matchesOwner;
    });
  }, [recipes, search, favoritesOnly, ownerFilter]);

  const isBrowsingUnfiltered = !search.trim() && !favoritesOnly && !ownerFilter;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border bg-surface p-1">
        {OWNER_FILTERS.map((owner) => (
          <button
            key={owner}
            onClick={() => setOwnerFilter(ownerFilter === owner ? null : owner)}
            className={cn(
              "rounded-lg py-2 text-sm font-medium cursor-pointer transition-colors",
              ownerFilter === owner ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground",
            )}
          >
            {owner}
          </button>
        ))}
        <button
          onClick={() => setOwnerFilter(null)}
          className={cn(
            "rounded-lg py-2 text-sm font-medium cursor-pointer transition-colors",
            ownerFilter === null ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground",
          )}
        >
          הכול
        </button>
      </div>

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
          </div>

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
                    : "נסו לשנות או לנקות את החיפוש."
                  : "הוסיפו את המתכון הראשון שלכם כדי להתחיל."
              }
            />
          ) : isBrowsingUnfiltered ? (
            <CategorizedRecipeGrid
              recipes={filtered}
              selectedIds={selectionMode ? selectedIds : undefined}
              onToggleSelect={toggleSelected}
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
