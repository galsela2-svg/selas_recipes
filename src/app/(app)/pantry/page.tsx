"use client";

import { useState, type FormEvent } from "react";
import { Package, Plus, X } from "lucide-react";
import { useAddPantryItem, usePantryItems, useRemovePantryItem } from "@/lib/queries/pantry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";

export default function PantryPage() {
  const { data: items, isLoading } = usePantryItems();
  const addItem = useAddPantryItem();
  const removeItem = useRemovePantryItem();
  const [draft, setDraft] = useState("");

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    addItem.mutate(draft, { onSuccess: () => setDraft("") });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="לדוגמה: מלח, קמח, ביצים..."
          className="flex-1"
        />
        <Button type="submit" loading={addItem.isPending}>
          <Plus className="size-4" />
        </Button>
      </form>

      {isLoading ? (
        <Spinner />
      ) : !items || items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="המזווה ריק"
          description="הוסיפו מוצרים שתמיד יש לכם בבית."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 text-sm text-foreground">{item.name}</span>
              <button
                onClick={() => removeItem.mutate(item.id)}
                className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-danger cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
