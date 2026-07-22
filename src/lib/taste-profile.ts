import type { Recipe } from "@/lib/types";

// Used only when the collection is empty (or to keep suggestions varied
// even when it isn't) — generic, broadly appealing dish ideas.
const DISCOVERY_POOL = [
  "מרק ביתי",
  "פסטה קרמית",
  "עוגת שוקולד",
  "סלט קליל",
  "תבשיל בשר",
  "מתכון תורכי",
  "קינוח קל",
  "עוף בתנור",
  "מאפה מלוח",
  "ארוחת ערב מהירה",
  "מתכון איטלקי",
  "עוגיות ביתיות",
];

/**
 * Builds a randomized web-search query biased toward what this household
 * actually cooks — the most common tags/dietary tags across their saved
 * recipes (favorites weighted higher), combined with a random dish idea for
 * variety. Falls back to pure discovery when there isn't enough data yet.
 */
export function buildDiscoveryQuery(recipes: Recipe[] | undefined): string {
  const frequency = new Map<string, number>();
  for (const recipe of recipes ?? []) {
    const weight = recipe.is_favorite ? 2 : 1;
    for (const tag of [...recipe.tags, ...recipe.dietary_tags]) {
      frequency.set(tag, (frequency.get(tag) ?? 0) + weight);
    }
  }

  const topTags = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  const picks: string[] = [];
  if (topTags.length > 0) {
    picks.push(topTags[Math.floor(Math.random() * topTags.length)]);
  }
  picks.push(DISCOVERY_POOL[Math.floor(Math.random() * DISCOVERY_POOL.length)]);

  return picks.join(" ");
}
