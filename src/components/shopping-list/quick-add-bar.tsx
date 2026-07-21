"use client";

import { useMemo } from "react";
import { Check, Pin, Settings, Zap } from "lucide-react";
import { useKnownItemsDetailed } from "@/lib/queries/known-items";
import { useAddShoppingItems } from "@/lib/queries/shopping-list";
import { cn } from "@/lib/utils";

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

  const visible = useMemo(() => (knownItems ?? []).slice(0, MAX_VISIBLE), [knownItems]);

  if (isLoading) return null;
  if (visible.length === 0) return null;

  function handleAdd(name: string) {
    if (existingNames.has(name)) return;
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
        {visible.map((item) => {
          const onList = existingNames.has(item.name);
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => handleAdd(item.name)}
              disabled={onList}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm cursor-pointer transition-colors",
                onList
                  ? "border-success/40 bg-success/10 text-success cursor-default"
                  : "border-border bg-surface text-foreground hover:border-accent/50",
              )}
            >
              {item.pinned && !onList && <Pin className="size-3 fill-accent text-accent" />}
              {onList && <Check className="size-3.5" />}
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
