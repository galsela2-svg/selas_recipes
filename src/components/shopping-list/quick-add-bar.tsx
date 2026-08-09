"use client";

import { useMemo } from "react";
import { Pin, Settings, Zap } from "lucide-react";
import { useKnownItemsDetailed } from "@/lib/queries/known-items";
import { useAddShoppingItems } from "@/lib/queries/shopping-list";

const MAX_VISIBLE = 20;

export function QuickAddBar({
  existingNames,
  onManage,
}: {
  existingNames: Set<string>;
  onManage: () => void;
}) {
  const { data: knownItems, isLoading } = useKnownItemsDetailed();
  const addItems = useAddShoppingItems();

  // Tapping a token adds it and drops it from this row (not just marks it as
  // added) — it comes back once it's off the shopping list again (bought and
  // cleared, or removed by hand), instead of lingering here disabled.
  const visible = useMemo(
    () => (knownItems ?? []).filter((item) => !existingNames.has(item.name)).slice(0, MAX_VISIBLE),
    [knownItems, existingNames],
  );

  if (isLoading) return null;
  if (visible.length === 0) return null;

  function handleAdd(name: string) {
    addItems.mutate({ names: [name], recipeId: null });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-0.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <Zap className="size-3.5" />
          הוספה מהירה
        </span>
        <button
          onClick={onManage}
          className="flex items-center gap-1 text-xs text-muted hover:text-foreground cursor-pointer"
        >
          <Settings className="size-3.5" />
          ניהול
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {visible.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => handleAdd(item.name)}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent/50 cursor-pointer"
          >
            {item.pinned && <Pin className="size-3 fill-accent text-accent" />}
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}
