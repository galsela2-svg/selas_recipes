import type { ParsedRecipe } from "@/lib/types";
import { DIETARY_TAG_GROUPS } from "@/lib/types";

// Keyword-based, not AI-based — runs for every scraped web recipe with zero
// extra cost/latency and no dependency on ANTHROPIC_API_KEY. Not a halachic
// authority: it's a best-effort filter to catch obvious mismatches (a dairy
// cake showing up for a "חלבי" search), not a guarantee of certified kashrut.

const MEAT_WORDS = [
  "בשר",
  "בקר",
  "עגל",
  "כבש",
  "טלה",
  "עוף",
  "הודו",
  "ברווז",
  "אווז",
  "נקניק",
  "נקניקיה",
  "קבב",
  "קציצ",
  "סטייק",
  "המבורגר",
  "שניצל",
  "פסטרמה",
  "כבד",
  "צלי",
  "פרגית",
  "חזה עוף",
  "שוקי עוף",
  "כנפי עוף",
];

const DAIRY_WORDS = [
  "חלב",
  "גבינ",
  "שמנת",
  "חמאה",
  "יוגורט",
  "קוטג'",
  "קוטג",
  "לבן",
  "מעדן חלב",
  "מסקרפונה",
  "ריקוטה",
  "פרמזן",
  "מוצרלה",
  "קרם פרש",
  "חלבי",
];

const VEGAN_CONFLICT_WORDS = [
  ...MEAT_WORDS,
  ...DAIRY_WORDS,
  "דג",
  "סלמון",
  "טונה",
  "ביצה",
  "ביצים",
  "דבש",
];

const GLUTEN_WORDS = ["קמח חיטה", "קמח לבן", "פסטה", "לחם", "בורגול", "סולת", "פריכיות", "קוסקוס"];

export type KosherCategory = "meat" | "dairy" | "parve" | "unknown";

export type DietaryClassification = {
  kosherCategory: KosherCategory;
  isVegan: boolean | null;
  isVegetarian: boolean | null;
  isGlutenFree: boolean | null;
};

function textOf(recipe: ParsedRecipe): string {
  return [recipe.title, recipe.description ?? "", ...recipe.ingredients]
    .join(" ")
    .toLowerCase();
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

export function classifyRecipe(recipe: ParsedRecipe): DietaryClassification {
  const text = textOf(recipe);
  const hasMeat = includesAny(text, MEAT_WORDS);
  const hasDairy = includesAny(text, DAIRY_WORDS);

  let kosherCategory: KosherCategory = "unknown";
  if (hasMeat && !hasDairy) kosherCategory = "meat";
  else if (hasDairy && !hasMeat) kosherCategory = "dairy";
  else if (!hasMeat && !hasDairy && text.length > 0) kosherCategory = "parve";

  return {
    kosherCategory,
    isVegan: text.length > 0 ? !includesAny(text, VEGAN_CONFLICT_WORDS) : null,
    isVegetarian: text.length > 0 ? !hasMeat && !includesAny(text, ["דג", "סלמון", "טונה"]) : null,
    isGlutenFree: text.length > 0 ? !includesAny(text, GLUTEN_WORDS) : null,
  };
}

// The set of dietary/kosher option words we know how to actually verify —
// only these can turn into a hard "requirement" that discards mismatches;
// anything else (meal type, occasion, baby age, etc.) is left to the text
// search bias alone, since we have no signal to check it against.
const CHECKABLE_OPTIONS = new Set(
  DIETARY_TAG_GROUPS.find((g) => g.label === "כשרות")!.options.concat(
    "טבעוני",
    "צמחוני",
    "ללא גלוטן",
  ),
);

/** Extracts explicit dietary/kosher requirement words present in a search query, as whole words. */
export function extractRequirements(query: string): string[] {
  const words = query.split(/\s+/);
  return [...CHECKABLE_OPTIONS].filter((option) =>
    option.split(/\s+/).every((w) => words.includes(w)),
  );
}

/** True if the recipe contradicts one of the requested requirements (should be discarded). */
export function contradictsRequirements(recipe: ParsedRecipe, requirements: string[]): boolean {
  if (requirements.length === 0) return false;
  const c = classifyRecipe(recipe);

  for (const req of requirements) {
    if (req === "חלבי" && c.kosherCategory !== "unknown" && c.kosherCategory !== "dairy") return true;
    if (req === "בשרי" && c.kosherCategory !== "unknown" && c.kosherCategory !== "meat") return true;
    if (req === "פרווה" && c.kosherCategory !== "unknown" && c.kosherCategory !== "parve") return true;
    if (req === "טבעוני" && c.isVegan === false) return true;
    if (req === "צמחוני" && c.isVegetarian === false) return true;
    if (req === "ללא גלוטן" && c.isGlutenFree === false) return true;
  }
  return false;
}
