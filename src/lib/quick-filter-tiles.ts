import {
  Baby,
  Ban,
  Beef,
  CakeSlice,
  Cookie,
  CookingPot,
  Croissant,
  CupSoda,
  Dessert,
  Drumstick,
  Dumbbell,
  EggFried,
  Flame,
  Hamburger,
  Leaf,
  Meh,
  Milk,
  MilkOff,
  Pizza,
  Salad,
  Sandwich,
  Scale,
  Smile,
  Snowflake,
  Soup,
  Sparkles,
  Sprout,
  Star,
  Tag,
  Thermometer,
  TrendingDown,
  UtensilsCrossed,
  WheatOff,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { DIETARY_TAG_GROUPS } from "@/lib/types";

export type CategoryTile =
  | { kind: "dietary"; tag: string; group: string; icon: LucideIcon; label: string }
  | { kind: "time"; bucket: "short"; icon: LucideIcon; label: string }
  | { kind: "rating"; threshold: number; icon: LucideIcon; label: string };

export function tileKey(tile: CategoryTile): string {
  if (tile.kind === "dietary") return `dietary:${tile.group}:${tile.tag}`;
  if (tile.kind === "time") return `time:${tile.bucket}`;
  return `rating:${tile.threshold}`;
}

// The curated starting strip every new user sees — hand-picked icons for
// the most commonly used quick filters.
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
  { kind: "rating", threshold: 8, icon: Star, label: "הכי מדורגים" },
  { kind: "dietary", tag: "לשבת וחג", group: "הזדמנות", icon: Sparkles, label: "שבת וחג" },
  { kind: "dietary", tag: "מתאים לילדים", group: "ילדים", icon: Baby, label: "ילדים" },
];

export const DEFAULT_TILE_KEYS: string[] = CATEGORY_TILES.map(tileKey);

// Icons for dietary tags not already covered above, so tiles added via
// "הוספת כפתור" still look intentional instead of one generic icon for
// everything — falls back to a plain tag icon for anything left over.
const EXTRA_ICONS: Record<string, LucideIcon> = {
  "דל פחמימות": TrendingDown,
  "ללא גלוטן": WheatOff,
  "עתיר חלבון": Dumbbell,
  "ללא מוצרי חלב": MilkOff,
  "טבעוני": Sprout,
  "דל סוכר": TrendingDown,
  "ללא אגוזים": Ban,
  "ללא ביצים": Ban,
  "ללא סויה": Ban,
  "קטוגני": Flame,
  "דל שומן": TrendingDown,
  "עוגות": CakeSlice,
  "פסטה": UtensilsCrossed,
  "מרקים": Soup,
  "סלטים": Salad,
  "עוף": Drumstick,
  "איטלקי": Pizza,
  "אסייתי": Soup,
  "אמריקאי": Hamburger,
  "מקסיקני": Flame,
  "הודי": CookingPot,
  "תאילנדי": Soup,
  "יווני": Salad,
  "מרוקאי": CookingPot,
  "צרפתי": Croissant,
  "מזרח תיכוני": Sandwich,
  "אפייה": Croissant,
  "טיגון": Flame,
  "בישול איטי": Flame,
  "גריל": Flame,
  "ללא בישול": Ban,
  "לא חריף": Snowflake,
  "חריף קלות": Thermometer,
  "חריף": Flame,
  "קל להכנה": Smile,
  "רמת קושי בינונית": Meh,
  "מתכון מאתגר": Dumbbell,
  "יום הולדת": CakeSlice,
  "פיקניק": Sandwich,
  "ארוחת ביניים": Cookie,
  "משקה": CupSoda,
};

function iconFor(tag: string): LucideIcon {
  return EXTRA_ICONS[tag] ?? Tag;
}

const curatedDietaryKeys = new Set(
  CATEGORY_TILES.filter((t) => t.kind === "dietary").map((t) => `${t.group}:${t.tag}`),
);

// Every tile a user could possibly add: the curated set above, plus one
// tile per remaining dietary tag not already covered.
export const CATEGORY_TILE_CATALOG: CategoryTile[] = [
  ...CATEGORY_TILES,
  ...DIETARY_TAG_GROUPS.flatMap((group) =>
    group.options
      .filter((tag) => !curatedDietaryKeys.has(`${group.label}:${tag}`))
      .map(
        (tag): CategoryTile => ({
          kind: "dietary",
          tag,
          group: group.label,
          icon: iconFor(tag),
          label: tag,
        }),
      ),
  ),
];

export const TILE_CATALOG_BY_KEY = new Map(CATEGORY_TILE_CATALOG.map((t) => [tileKey(t), t]));
