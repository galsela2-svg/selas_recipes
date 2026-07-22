import {
  BookOpen,
  Camera,
  ChefHat,
  Flame,
  Heart,
  Library,
  Package,
  Palette,
  Star,
  Trophy,
  Utensils,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { CookLog, Recipe } from "@/lib/types";
import { addDaysIso, todayIsoDate } from "@/lib/date-utils";

export type AchievementInput = {
  recipes: Recipe[];
  cookLogs: CookLog[];
  pantryCount: number;
  photoCount: number;
};

export type Achievement = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  current: number;
  target: number;
  unlocked: boolean;
};

/** Longest streak of consecutive calendar days with at least one cook log,
 * counting backward from today (or yesterday, so it doesn't reset at
 * midnight the day after cooking). */
export function computeCookingStreak(cookLogs: CookLog[]): number {
  const days = new Set(cookLogs.map((log) => log.cooked_on));
  if (days.size === 0) return 0;

  let cursor = todayIsoDate();
  if (!days.has(cursor)) {
    cursor = addDaysIso(cursor, -1);
    if (!days.has(cursor)) return 0;
  }

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDaysIso(cursor, -1);
  }
  return streak;
}

function clampToTarget(current: number, target: number): number {
  return Math.min(current, target);
}

export function computeAchievements({
  recipes,
  cookLogs,
  pantryCount,
  photoCount,
}: AchievementInput): Achievement[] {
  const streak = computeCookingStreak(cookLogs);
  const ratedCount = cookLogs.filter((l) => l.rating !== null).length;
  const favoriteCount = recipes.filter((r) => r.is_favorite).length;

  const cookedRecipeIds = new Set(cookLogs.map((l) => l.recipe_id));
  const cookedDietaryTags = new Set<string>();
  for (const recipe of recipes) {
    if (!cookedRecipeIds.has(recipe.id)) continue;
    for (const tag of recipe.dietary_tags) cookedDietaryTags.add(tag);
  }

  function make(
    id: string,
    icon: LucideIcon,
    title: string,
    description: string,
    current: number,
    target: number,
  ): Achievement {
    return {
      id,
      icon,
      title,
      description,
      current: clampToTarget(current, target),
      target,
      unlocked: current >= target,
    };
  }

  return [
    make("first-cook", ChefHat, "טעימה ראשונה", "רשמו את הבישול הראשון שלכם", cookLogs.length, 1),
    make("cook-5", Utensils, "שף מתחיל", "5 בישולים רשומים", cookLogs.length, 5),
    make("cook-20", UtensilsCrossed, "שף מנוסה", "20 בישולים רשומים", cookLogs.length, 20),
    make("cook-50", Trophy, "אלוף המטבח", "50 בישולים רשומים", cookLogs.length, 50),
    make("collector-10", BookOpen, "האספן", "10 מתכונים בספר שלכם", recipes.length, 10),
    make("collector-50", Library, "ספרן אמיתי", "50 מתכונים בספר שלכם", recipes.length, 50),
    make("critic", Star, "מבקר מקצועי", "דירגו 10 בישולים", ratedCount, 10),
    make("streak-3", Flame, "רצף אש", "3 ימי בישול ברצף", streak, 3),
    make("streak-7", Zap, "רצף שבועי", "7 ימי בישול ברצף", streak, 7),
    make("photographer", Camera, "צלם אוכל", "5 תמונות תוצאה שהעליתם", photoCount, 5),
    make("favorites", Heart, "מאהב מתכונים", "5 מתכונים מסומנים כמועדפים", favoriteCount, 5),
    make("pantry", Package, "מנהל מזווה", "5 פריטים במזווה שלכם", pantryCount, 5),
    make(
      "variety",
      Palette,
      "מגוון תזונתי",
      "בישלתם מתכונים מ-3 קטגוריות תזונה שונות",
      cookedDietaryTags.size,
      3,
    ),
  ];
}
