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
  Tag,
  Thermometer,
  TrendingDown,
  UtensilsCrossed,
  WheatOff,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { DIETARY_TAG_GROUPS } from "@/lib/types";

export type CategoryTile = { tag: string; group: string; icon: LucideIcon; label: string };

export function tileKey(tile: CategoryTile): string {
  return `${tile.group}:${tile.tag}`;
}

// The curated starting strip every user sees — hand-picked icons for the
// most commonly used categories (meal type, kosher category, quick & easy).
export const CATEGORY_TILES: CategoryTile[] = [
  { tag: "ארוחת בוקר", group: "סוג ארוחה", icon: EggFried, label: "בוקר" },
  { tag: "ארוחת צהריים", group: "סוג ארוחה", icon: Sandwich, label: "צהריים" },
  { tag: "ארוחת ערב", group: "סוג ארוחה", icon: UtensilsCrossed, label: "ערב" },
  { tag: "קינוח", group: "סוג ארוחה", icon: Dessert, label: "קינוחים" },
  { tag: "מאפים", group: "סוג ארוחה", icon: Croissant, label: "מאפים" },
  { tag: "בשרי", group: "כשרות", icon: Beef, label: "בשרי" },
  { tag: "חלבי", group: "כשרות", icon: Milk, label: "חלבי" },
  { tag: "פרווה", group: "כשרות", icon: Scale, label: "פרווה" },
  { tag: "צמחוני", group: "תזונה ואלרגנים", icon: Leaf, label: "צמחוני" },
  { tag: "קל להכנה", group: "רמת קושי", icon: Zap, label: "מהיר וקל" },
  { tag: "לשבת וחג", group: "הזדמנות", icon: Sparkles, label: "שבת וחג" },
  { tag: "מתאים לילדים", group: "ילדים", icon: Baby, label: "ילדים" },
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
  "רמת קושי בינונית": Meh,
  "מתכון מאתגר": Dumbbell,
  "יום הולדת": CakeSlice,
  "פיקניק": Sandwich,
  "ארוחת ביניים": Cookie,
  "משקה": CupSoda,
  "מתאים לילדים": Baby,
  "קל להכנה": Smile,
};

function iconFor(tag: string): LucideIcon {
  return EXTRA_ICONS[tag] ?? Tag;
}

const curatedKeys = new Set(CATEGORY_TILES.map((t) => `${t.group}:${t.tag}`));

// Every tile a user could possibly add: the curated set above, plus one
// tile per remaining dietary/category tag not already covered.
export const CATEGORY_TILE_CATALOG: CategoryTile[] = [
  ...CATEGORY_TILES,
  ...DIETARY_TAG_GROUPS.flatMap((group) =>
    group.options
      .filter((tag) => !curatedKeys.has(`${group.label}:${tag}`))
      .map(
        (tag): CategoryTile => ({
          tag,
          group: group.label,
          icon: iconFor(tag),
          label: tag,
        }),
      ),
  ),
];

export const TILE_CATALOG_BY_KEY = new Map(CATEGORY_TILE_CATALOG.map((t) => [tileKey(t), t]));
