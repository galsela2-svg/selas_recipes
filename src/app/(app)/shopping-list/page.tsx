"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Package, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import {
  useAddShoppingItems,
  useClearCheckedItems,
  useDeleteShoppingItem,
  useShoppingList,
  useToggleShoppingItem,
} from "@/lib/queries/shopping-list";
import { useKnownItems } from "@/lib/queries/known-items";
import { useRecipes } from "@/lib/queries/recipes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { QuickAddBar } from "@/components/shopping-list/quick-add-bar";
import { KnownItemsManager } from "@/components/shopping-list/known-items-manager";
import { cn } from "@/lib/utils";

export default function ShoppingListPage() {
  const { data: items, isLoading } = useShoppingList();
  const addItems = useAddShoppingItems();
  const toggleItem = useToggleShoppingItem();
  const deleteItem = useDeleteShoppingItem();
  const clearChecked = useClearCheckedItems();
  const { data: knownItems } = useKnownItems();
  const { data: recipes } = useRecipes();
  const [draft, setDraft] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showManager, setShowManager] = useState(false);

  const pool = useMemo(() => {
    const set = new Set<string>(knownItems ?? []);
    for (const recipe of recipes ?? []) {
      for (const ingredient of recipe.ingredients) set.add(ingredient);
    }
    return Array.from(set);
  }, [knownItems, recipes]);

  const existingNames = useMemo(
    () => new Set((items ?? []).map((i) => i.name)),
    [items],
  );

  const suggestions = useMemo(() => {
    const query = draft.trim().toLowerCase();
    if (!query) return [];
    return pool
      .filter(
        (item) => item.toLowerCase().includes(query) && !existingNames.has(item),
      )
      .slice(0, 6);
  }, [draft, pool, existingNames]);

  function submitItem(name: string) {
    if (!name.trim()) return;
    addItems.mutate({ names: [name], recipeId: null });
    setDraft("");
    setShowSuggestions(false);
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    submitItem(draft);
  }

  const uncheckedItems = items?.filter((i) => !i.checked) ?? [];
  const checkedItems = items?.filter((i) => i.checked) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            רשימת קניות
          </h1>
          <p className="text-sm text-muted">מסונכרן עם משק הבית שלכם.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/pantry"
            title="המזווה שלי"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <Package className="size-4" />
          </Link>
          {checkedItems.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => clearChecked.mutate()}
              loading={clearChecked.isPending}
            >
              <Trash2 className="size-3.5" />
              ניקוי מסומנים
            </Button>
          )}
        </div>
      </div>

      <QuickAddBar existingNames={existingNames} onManage={() => setShowManager(true)} />

      <form onSubmit={handleAdd} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="הוספת פריט..."
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-52 overflow-auto rounded-lg border border-border bg-surface-2 shadow-lg">
              {suggestions.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => submitItem(item)}
                    className="block w-full px-3 py-2.5 text-start text-sm text-foreground hover:bg-surface cursor-pointer"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button type="submit" loading={addItems.isPending}>
          <Plus className="size-4" />
        </Button>
      </form>

      {isLoading ? (
        <Spinner />
      ) : !items || items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="רשימת הקניות שלכם ריקה"
          description="הוסיפו פריטים למעלה, או הוסיפו מרכיבים מדף מתכון."
        />
      ) : (
        <div className="space-y-6">
          <ItemGroup
            items={uncheckedItems}
            onToggle={(id, checked) => toggleItem.mutate({ id, checked })}
            onDelete={(id) => deleteItem.mutate(id)}
          />

          {checkedItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                מסומנים
              </p>
              <ItemGroup
                items={checkedItems}
                onToggle={(id, checked) => toggleItem.mutate({ id, checked })}
                onDelete={(id) => deleteItem.mutate(id)}
              />
            </div>
          )}
        </div>
      )}

      <KnownItemsManager open={showManager} onClose={() => setShowManager(false)} />
    </div>
  );
}

function ItemGroup({
  items,
  onToggle,
  onDelete,
}: {
  items: {
    id: string;
    name: string;
    checked: boolean;
    recipe_id: string | null;
    recipe_title?: string | null;
  }[];
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {items.map((item) => (
        <li
          key={item.id}
          className="group flex items-center gap-3 px-4 py-3"
        >
          <button
            onClick={() => onToggle(item.id, !item.checked)}
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-md border cursor-pointer transition-colors",
              item.checked
                ? "border-accent bg-accent"
                : "border-border hover:border-accent",
            )}
          >
            {item.checked && (
              <svg viewBox="0 0 16 16" className="size-3 fill-accent-foreground">
                <path d="M6.5 11.5 3 8l1-1 2.5 2.5L12 4l1 1z" />
              </svg>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-sm text-foreground",
                item.checked && "text-muted line-through",
              )}
            >
              {item.name}
            </p>
            {item.recipe_id && item.recipe_title && (
              <Link
                href={`/recipes/${item.recipe_id}`}
                className="text-xs text-muted hover:text-accent"
              >
                {item.recipe_title}
              </Link>
            )}
          </div>

          <button
            onClick={() => onDelete(item.id)}
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-danger cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
