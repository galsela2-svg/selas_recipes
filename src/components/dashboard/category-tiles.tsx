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
                className={cn(
                  "flex size-9 items-center justify-center rounded-full bg-gradient-to-br",
                  active
                    ? "from-accent/30 to-[#f3e0d0]"
                    : "from-accent/10 to-[#f3e0d0]/50",
                )}
              >
                <Icon className={cn("size-5", active ? "text-accent" : "text-muted")} strokeWidth={1.75} />
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
