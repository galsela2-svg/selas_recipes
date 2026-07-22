"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Download, Image as ImageIcon } from "lucide-react";
import { useRecipes } from "@/lib/queries/recipes";
import { usePantryItems } from "@/lib/queries/pantry";
import { fetchAllCookLogs } from "@/lib/queries/cook-logs";
import { backupToJson, downloadFile, recipesToCsv } from "@/lib/export-data";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

export default function ExportPage() {
  const router = useRouter();
  const { data: recipes, isLoading } = useRecipes();
  const { data: pantryItems } = usePantryItems();
  const [backingUp, setBackingUp] = useState<"json" | "csv" | null>(null);
  // null = "not yet customized" -> defaults to every loaded recipe.
  const [customSelection, setCustomSelection] = useState<Set<string> | null>(null);
  const [includeImages, setIncludeImages] = useState(true);

  async function handleBackup(format: "json" | "csv") {
    if (!recipes) return;
    setBackingUp(format);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === "csv") {
        downloadFile(`recipes-${stamp}.csv`, recipesToCsv(recipes), "text/csv");
      } else {
        const cookLogs = await fetchAllCookLogs();
        downloadFile(
          `recipe-backup-${stamp}.json`,
          backupToJson({ recipes, cookLogs, pantryItems: pantryItems ?? [] }),
          "application/json",
        );
      }
    } finally {
      setBackingUp(null);
    }
  }

  const selected = useMemo(
    () => customSelection ?? new Set((recipes ?? []).map((r) => r.id)),
    [customSelection, recipes],
  );
  const allSelected = Boolean(recipes) && selected.size === recipes!.length;

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCustomSelection(next);
  }

  function toggleAll() {
    if (!recipes) return;
    setCustomSelection(allSelected ? new Set() : new Set(recipes.map((r) => r.id)));
  }

  function handleExport() {
    const params = new URLSearchParams({
      ids: Array.from(selected).join(","),
      images: includeImages ? "1" : "0",
    });
    router.push(`/export/print?${params.toString()}`);
  }

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <label className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ImageIcon className="size-4 text-muted" />
          כלול תמונות
        </span>
        <Switch checked={includeImages} onChange={setIncludeImages} />
      </label>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {selected.size} מתוך {recipes?.length ?? 0} מתכונים נבחרו
        </p>
        <Button variant="secondary" size="sm" onClick={toggleAll}>
          {allSelected ? "בטל בחירת הכול" : "בחר הכול"}
        </Button>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {(recipes ?? []).map((recipe) => (
          <li key={recipe.id}>
            <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={selected.has(recipe.id)}
                onChange={() => toggle(recipe.id)}
                className="size-5 shrink-0 accent-[var(--accent)]"
              />
              <span className="flex-1 truncate text-sm text-foreground">
                {recipe.title}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <Button
        size="lg"
        className="w-full"
        disabled={selected.size === 0}
        onClick={handleExport}
      >
        <BookOpen className="size-4" />
        הכנת עמוד להדפסה ({selected.size})
      </Button>

      <div className="space-y-3 border-t border-border pt-6">
        <div>
          <h2 className="font-semibold text-foreground">גיבוי נתונים</h2>
          <p className="text-sm text-muted">
            הורידו את כל המתכונים, התגיות ויומן הבישול לקובץ מקומי.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            loading={backingUp === "json"}
            onClick={() => handleBackup("json")}
          >
            <Download className="size-4" />
            גיבוי מלא (JSON)
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            loading={backingUp === "csv"}
            onClick={() => handleBackup("csv")}
          >
            <Download className="size-4" />
            מתכונים (CSV)
          </Button>
        </div>
      </div>
    </div>
  );
}
