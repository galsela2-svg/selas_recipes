"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { useSettings } from "@/components/providers/settings-provider";
import { DIETARY_TAG_GROUPS } from "@/lib/types";
import { Button } from "@/components/ui/button";

/** Which dietary_tags show as their own shelf (heading + up to 9 recipes,
 * scrollable for more) on the main recipes page, and in what order — a
 * per-device preference like the theme/accent settings, editable by anyone,
 * not just the app admin. Shared between Settings and the bottom of the
 * dashboard itself, so there are two places to reach the same editor. */
export function DashboardCategoriesEditor() {
  const [settings, setSetting] = useSettings();
  const [toAdd, setToAdd] = useState("");
  const categories = settings.dashboardCategoryTags;

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    setSetting("dashboardCategoryTags", next);
  }

  function remove(tag: string) {
    setSetting(
      "dashboardCategoryTags",
      categories.filter((t) => t !== tag),
    );
  }

  function add() {
    if (!toAdd || categories.includes(toAdd)) return;
    setSetting("dashboardCategoryTags", [...categories, toAdd]);
    setToAdd("");
  }

  return (
    <div className="space-y-2">
      {categories.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {categories.map((tag, i) => (
            <li key={tag} className="flex items-center gap-1 px-4 py-2">
              <span className="flex-1 truncate text-sm font-medium text-foreground">{tag}</span>
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                title="הזזה למעלה"
                className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === categories.length - 1}
                title="הזזה למטה"
                className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronDown className="size-4" />
              </button>
              <button
                onClick={() => remove(tag)}
                title="הסרה מהעמוד הראשי"
                className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger/10 hover:text-danger cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <select
          value={toAdd}
          onChange={(e) => setToAdd(e.target.value)}
          className="h-11 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground"
        >
          <option value="">הוספת קטגוריה...</option>
          {DIETARY_TAG_GROUPS.map((group) => {
            const available = group.options.filter((opt) => !categories.includes(opt));
            if (available.length === 0) return null;
            return (
              <optgroup key={group.label} label={group.label}>
                {available.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <Button variant="secondary" onClick={add} disabled={!toAdd}>
          <Plus className="size-4" />
          הוספה
        </Button>
      </div>
    </div>
  );
}
