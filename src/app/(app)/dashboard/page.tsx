"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Search, SlidersHorizontal, UtensilsCrossed } from "lucide-react";
import { useRecipes } from "@/lib/queries/recipes";
import { useTags } from "@/lib/queries/tags";
import { DIETARY_TAG_OPTIONS } from "@/lib/types";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { data: recipes, isLoading } = useRecipes();
  const tags = useTags();
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [dietaryFilters, setDietaryFilters] = useState<string[]>([]);
  const [showDietaryFilter, setShowDietaryFilter] = useState(false);

  const filtered = useMemo(() => {
    if (!recipes) return [];
    const query = search.trim().toLowerCase();

    return recipes.filter((recipe) => {
      const matchesSearch =
        !query || recipe.title.toLowerCase().includes(query);
      const matchesTag = !activeTag || recipe.tags.includes(activeTag);
      const matchesDietary = dietaryFilters.every((d) => recipe.dietary_tags.includes(d));
      return matchesSearch && matchesTag && matchesDietary;
    });
  }, [recipes, search, activeTag, dietaryFilters]);

  function toggleDietaryFilter(tag: string) {
    setDietaryFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">מתכונים</h1>
          <p className="text-sm text-muted">
            האוסף המשותף שלכם, מסונכרן בזמן אמת.
          </p>
        </div>
        <Link
          href="/export"
          title="ייצוא לספר מתכונים"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <BookOpen className="size-4.5" />
        </Link>
      </div>

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
            onClick={() => setShowDietaryFilter(true)}
            className={cn(
              "relative flex size-11 shrink-0 items-center justify-center rounded-lg border cursor-pointer",
              dietaryFilters.length > 0
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-muted hover:bg-surface-2",
            )}
          >
            <SlidersHorizontal className="size-4" />
            {dietaryFilters.length > 0 && (
              <span className="absolute -top-1 -end-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                {dietaryFilters.length}
              </span>
            )}
          </button>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
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
          </div>
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title={recipes?.length ? "לא נמצאו מתכונים תואמים" : "עדיין אין מתכונים"}
          description={
            recipes?.length
              ? "נסו חיפוש, תגית או סינון אחר."
              : "הוסיפו את המתכון הראשון שלכם כדי להתחיל."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}

      <Modal
        open={showDietaryFilter}
        onClose={() => setShowDietaryFilter(false)}
        title="סינון תזונתי"
      >
        <p className="mb-3 text-xs text-muted">
          יוצגו רק מתכונים שמתאימים לכל התכונות שתבחרו.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DIETARY_TAG_OPTIONS.map((tag) => (
            <Badge
              key={tag}
              active={dietaryFilters.includes(tag)}
              onClick={() => toggleDietaryFilter(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDietaryFilters([])}>
            איפוס
          </Button>
          <Button size="sm" onClick={() => setShowDietaryFilter(false)}>
            החלה
          </Button>
        </div>
      </Modal>
    </div>
  );
}
