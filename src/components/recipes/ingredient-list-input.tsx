"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { useKnownItems, useRecordKnownItems } from "@/lib/queries/known-items";
import { useRecipes } from "@/lib/queries/recipes";
import { Input } from "@/components/ui/input";

export function IngredientListInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ingredients: string[]) => void;
}) {
  const { data: knownItems } = useKnownItems();
  const { data: recipes } = useRecipes();
  const recordKnownItems = useRecordKnownItems();
  const [draft, setDraft] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const pool = useMemo(() => {
    const set = new Set<string>(knownItems ?? []);
    for (const recipe of recipes ?? []) {
      for (const ingredient of recipe.ingredients) set.add(ingredient);
    }
    return Array.from(set);
  }, [knownItems, recipes]);

  const suggestions = useMemo(() => {
    const query = draft.trim().toLowerCase();
    if (!query) return [];
    return pool
      .filter((item) => item.toLowerCase().includes(query) && !value.includes(item))
      .slice(0, 6);
  }, [draft, pool, value]);

  function addIngredient(raw: string) {
    const text = raw.trim();
    if (!text) return;
    onChange([...value, text]);
    recordKnownItems.mutate([text]);
    setDraft("");
    setShowSuggestions(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addIngredient(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function startEditing(i: number) {
    setEditingIndex(i);
    setEditDraft(value[i]);
  }

  function commitEdit() {
    const i = editingIndex;
    setEditingIndex(null);
    if (i === null) return;
    const trimmed = editDraft.trim();
    if (!trimmed || trimmed === value[i]) return;
    onChange(value.map((item, idx) => (idx === i ? trimmed : item)));
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((ingredient, i) =>
            editingIndex === i ? (
              <li
                key={i}
                className="flex items-center gap-2 rounded-lg border border-accent/50 bg-surface px-3 py-2"
              >
                <span className="size-1.5 shrink-0 rounded-full bg-accent" />
                <input
                  autoFocus
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitEdit();
                    } else if (e.key === "Escape") {
                      setEditingIndex(null);
                    }
                  }}
                  onBlur={commitEdit}
                  className="flex-1 bg-transparent text-sm text-foreground outline-none"
                />
              </li>
            ) : (
              <li
                key={i}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
              >
                <span className="size-1.5 shrink-0 rounded-full bg-accent" />
                <button
                  type="button"
                  onClick={() => startEditing(i)}
                  className="flex-1 cursor-text text-start"
                >
                  {ingredient}
                </button>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-danger cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      <div className="relative">
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="הקלידו מרכיב ולחצו Enter להוספה..."
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-52 overflow-auto rounded-lg border border-border bg-surface-2 shadow-lg">
            {suggestions.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addIngredient(item)}
                  className="block w-full px-3 py-2.5 text-start text-sm text-foreground hover:bg-surface cursor-pointer"
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
