"use client";

import {
  Baby,
  Beef,
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

// Flat design on purpose: a solid (non-gradient) tinted badge behind a
// solid-filled icon glyph — two flat colors, no shading/gloss/shadow, and
// no emoji (which render with built-in depth on most platforms).
const TILE_COLORS: Record<string, { badge: string; icon: string }> = {
  בוקר: { badge: "#fef3c7", icon: "#b45309" },
  צהריים: { badge: "#ffedd5", icon: "#c2410c" },
  ערב: { badge: "#f3e8ff", icon: "#7e22ce" },
  קינוחים: { badge: "#fce7f3", icon: "#db2777" },
  מאפים: { badge: "#fef3c7", icon: "#92400e" },
  בשרי: { badge: "#fee2e2", icon: "#b91c1c" },
  חלבי: { badge: "#dbeafe", icon: "#2563eb" },
  פרווה: { badge: "#f1f5f9", icon: "#475569" },
  צמחוני: { badge: "#dcfce7", icon: "#15803d" },
  "מהיר וקל": { badge: "#fef9c3", icon: "#ca8a04" },
  מועדפים: { badge: "#ffe4e6", icon: "#e11d48" },
  "הכי מדורגים": { badge: "#fef3c7", icon: "#d97706" },
  "שבת וחג": { badge: "#ede9fe", icon: "#6d28d9" },
  תינוקות: { badge: "#e0f2fe", icon: "#0284c7" },
};

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
          const Icon = tile.icon;
          const colors = TILE_COLORS[tile.label];
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
              <span
                className="flex size-9 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.badge }}
              >
                <Icon
                  className="size-5"
                  strokeWidth={1.75}
                  style={{ color: colors.icon, fill: colors.icon, fillOpacity: 0.25 }}
                />
              </span>
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
