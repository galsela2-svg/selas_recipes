"use client";

import { useState } from "react";
import {
  Baby,
  Beef,
  ChevronDown,
  Croissant,
  Dessert,
  EggFried,
  Heart,
  Leaf,
  Milk,
  Sandwich,
  Scale,
  Sparkles,
  Star,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CategoryTile =
  | { kind: "dietary"; tag: string; group: string; icon: LucideIcon; label: string }
  | { kind: "time"; bucket: "short"; icon: LucideIcon; label: string }
  | { kind: "favorites"; icon: LucideIcon; label: string }
  | { kind: "rating"; threshold: number; icon: LucideIcon; label: string };

export const CATEGORY_TILES: CategoryTile[] = [
  { kind: "dietary", tag: "ארוחת בוקר", group: "סוג ארוחה", icon: EggFried, label: "בוקר" },
  { kind: "dietary", tag: "ארוחת צהריים", group: "סוג ארוחה", icon: Sandwich, label: "צהריים" },
  { kind: "dietary", tag: "ארוחת ערב", group: "סוג ארוחה", icon: UtensilsCrossed, label: "ערב" },
  { kind: "dietary", tag: "קינוח", group: "סוג ארוחה", icon: Dessert, label: "קינוחים" },
  { kind: "dietary", tag: "מאפים", group: "סוג ארוחה", icon: Croissant, label: "מאפים" },
  { kind: "dietary", tag: "בשרי", group: "כשרות", icon: Beef, label: "בשרי" },
  { kind: "dietary", tag: "חלבי", group: "כשרות", icon: Milk, label: "חלבי" },
  { kind: "dietary", tag: "פרווה", group: "כשרות", icon: Scale, label: "פרווה" },
  { kind: "dietary", tag: "צמחוני", group: "תזונה ואלרגנים", icon: Leaf, label: "צמחוני" },
  { kind: "time", bucket: "short", icon: Zap, label: "מהיר וקל" },
  { kind: "favorites", icon: Heart, label: "מועדפים" },
  { kind: "rating", threshold: 8, icon: Star, label: "הכי מדורגים" },
  { kind: "dietary", tag: "לשבת וחג", group: "הזדמנות", icon: Sparkles, label: "שבת וחג" },
  { kind: "dietary", tag: "עד גיל שנתיים", group: "תינוקות", icon: Baby, label: "תינוקות" },
];

// Flat design on purpose: the color lives only in the icon itself (a solid
// fill + solid stroke) — no badge/circle sitting behind it, no gradient, no
// shadow, no emoji.
const TILE_COLORS: Record<string, string> = {
  בוקר: "#b45309",
  צהריים: "#c2410c",
  ערב: "#7e22ce",
  קינוחים: "#db2777",
  מאפים: "#92400e",
  בשרי: "#b91c1c",
  חלבי: "#2563eb",
  פרווה: "#475569",
  צמחוני: "#15803d",
  "מהיר וקל": "#ca8a04",
  מועדפים: "#e11d48",
  "הכי מדורגים": "#d97706",
  "שבת וחג": "#6d28d9",
  תינוקות: "#0284c7",
};

export function CategoryTiles({
  isActive,
  onSelect,
}: {
  isActive: (tile: CategoryTile) => boolean;
  onSelect: (tile: CategoryTile) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // Auto-open if a tile from this section is already selected — collapsing
  // it shouldn't hide *why* the list is filtered.
  const hasActiveTile = CATEGORY_TILES.some(isActive);
  const isOpen = expanded || hasActiveTile;

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between cursor-pointer"
      >
        <p className="font-serif text-lg font-bold text-foreground">עיון לפי קטגוריה</p>
        <ChevronDown
          className={cn("size-5 text-muted transition-transform", isOpen && "rotate-180")}
        />
      </button>
      {isOpen && (
        <div className="grid grid-cols-4 gap-2.5">
          {CATEGORY_TILES.map((tile) => {
            const active = isActive(tile);
            const Icon = tile.icon;
            const color = TILE_COLORS[tile.label];
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
                <Icon
                  className="size-6"
                  strokeWidth={1.75}
                  style={{ color, fill: color, fillOpacity: 0.35 }}
                />
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
      )}
    </div>
  );
}
