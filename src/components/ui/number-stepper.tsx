"use client";

import { Minus, Plus } from "lucide-react";

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const numeric = value === "" ? 0 : Number(value);

  function adjust(delta: number) {
    let next = Math.max(min, (Number.isFinite(numeric) ? numeric : 0) + delta);
    if (max !== undefined) next = Math.min(max, next);
    onChange(String(next));
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
      <button
        type="button"
        onClick={() => adjust(-step)}
        disabled={numeric <= min}
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-surface-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Minus className="size-3.5" />
      </button>
      <input
        type="number"
        dir="ltr"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 min-w-0 flex-1 bg-transparent text-center text-sm text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => adjust(step)}
        disabled={max !== undefined && numeric >= max}
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-surface-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
