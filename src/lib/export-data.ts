import type { CookLog, PantryItem, Recipe } from "@/lib/types";

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvEscape).join(","));
  // BOM so Hebrew text renders correctly when opened in Excel.
  return "﻿" + lines.join("\n");
}

export function recipesToCsv(recipes: Recipe[]): string {
  const headers = [
    "title",
    "description",
    "prep_time_minutes",
    "cook_time_minutes",
    "servings",
    "ingredients",
    "instructions",
    "tags",
    "dietary_tags",
    "source_url",
    "created_at",
  ];

  const rows = recipes.map((r) => [
    r.title,
    r.description ?? "",
    String(r.prep_time_minutes ?? ""),
    String(r.cook_time_minutes ?? ""),
    String(r.servings ?? ""),
    r.ingredients.join(" | "),
    r.instructions.join(" | "),
    r.tags.join(", "),
    r.dietary_tags.join(", "),
    r.source_url ?? "",
    r.created_at,
  ]);

  return toCsv(headers, rows);
}

export function backupToJson(data: {
  recipes: Recipe[];
  cookLogs: CookLog[];
  pantryItems: PantryItem[];
}): string {
  return JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      ...data,
    },
    null,
    2,
  );
}
