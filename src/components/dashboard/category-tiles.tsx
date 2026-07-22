"use client";

import { cn } from "@/lib/utils";

export type CategoryTile =
  | { kind: "dietary"; tag: string; group: string; emoji: string; label: string }
  | { kind: "time"; bucket: "short"; emoji: string; label: string }
  | { kind: "favorites"; emoji: string; label: string }
  | { kind: "rating"; threshold: number; emoji: string; label: string };

export const CATEGORY_TILES: CategoryTile[] = [
  { kind: "dietary", tag: "ארוחת בוקר", group: "סוג ארוחה", emoji: "🍳", label: "בוקר" },
  { kind: "dietary", tag: "ארוחת צהריים", group: "סוג ארוחה", emoji: "🍲", label: "צהריים" },
  { kind: "dietary", tag: "ארוחת ערב", group: "סוג ארוחה", emoji: "🍽️", label: "ערב" },
  { kind: "dietary", tag: "קינוח", group: "סוג ארוחה", emoji: "🍰", label: "קינוחים" },
  { kind: "dietary", tag: "בשרי", group: "כשרות", emoji: "🥩", label: "בשרי" },
  { kind: "dietary", tag: "חלבי", group: "כשרות", emoji: "🧀", label: "חלבי" },
  { kind: "dietary", tag: "פרווה", group: "כשרות", emoji: "🥬", label: "פרווה" },
  { kind: "dietary", tag: "צמחוני", group: "תזונה ואלרגנים", emoji: "🌱", label: "צמחוני" },
  { kind: "time", bucket: "short", emoji: "⚡", label: "מהיר וקל" },
  { kind: "favorites", emoji: "❤️", label: "מועדפים" },
  { kind: "rating", threshold: 8, emoji: "⭐", label: "הכי מדורגים" },
  { kind: "dietary", tag: "לשבת וחג", group: "הזדמנות", emoji: "🕯️", label: "שבת וחג" },
];

export function CategoryTiles({
  isActive,
  onSelect,
}: {
  isActive: (tile: CategoryTile) => boolean;
  onSelect: (tile: CategoryTile) => void;
}) {
  return (
    <div className="space-y-2.5">
      <p className="font-serif text-lg font-bold text-foreground">עיון לפי קטגוריה</p>
      <div className="grid grid-cols-4 gap-2.5">
        {CATEGORY_TILES.map((tile) => {
          const active = isActive(tile);
          return (
            <button
              key={tile.label}
              onClick={() => onSelect(tile)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition-colors cursor-pointer",
                active
                  ? "border-accent bg-accent/15"
                  : "border-border bg-surface hover:border-accent/40",
              )}
            >
              <span className="text-2xl">{tile.emoji}</span>
              <span
                className={cn(
                  "text-[11px] font-medium leading-tight",
                  active ? "text-accent" : "text-muted",
                )}
              >
                {tile.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
