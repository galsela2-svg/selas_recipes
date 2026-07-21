"use client";

import { Minus, Plus, Users } from "lucide-react";

export function ServingsAdjuster({
  servings,
  onChange,
}: {
  servings: number;
  onChange: (servings: number) => void;
}) {
  function step(delta: number) {
    onChange(Math.max(1, servings + delta));
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
      <Users className="size-4 text-muted" />
      <span className="text-sm text-muted">מנות</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => step(-1)}
          className="flex size-8 items-center justify-center rounded-md text-foreground hover:bg-surface-2 cursor-pointer disabled:opacity-30"
          disabled={servings <= 1}
        >
          <Minus className="size-4" />
        </button>
        <input
          type="number"
          min={1}
          value={servings}
          dir="ltr"
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next) && next > 0) onChange(next);
          }}
          className="h-8 w-14 rounded-md border border-border bg-surface text-center text-sm text-foreground"
        />
        <button
          type="button"
          onClick={() => step(1)}
          className="flex size-8 items-center justify-center rounded-md text-foreground hover:bg-surface-2 cursor-pointer"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
