export const DIFFICULTY_LEVELS = [
  "קל",
  "קל-בינוני",
  "בינוני",
  "בינוני-קשה",
  "קשה",
  "קשה מאוד",
] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

/**
 * A recipe rarely states its own difficulty, so this estimates one from
 * shape alone — more ingredients, more steps, and more total time all push
 * toward "harder". It's a rough read at a glance, not a claim of fact.
 */
export function estimateDifficulty(recipe: {
  ingredients: string[];
  instructions: string[];
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
}): DifficultyLevel {
  const totalMinutes = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  const score =
    recipe.ingredients.length * 1 + recipe.instructions.length * 1.5 + totalMinutes / 20;

  if (score < 8) return "קל";
  if (score < 14) return "קל-בינוני";
  if (score < 20) return "בינוני";
  if (score < 28) return "בינוני-קשה";
  if (score < 36) return "קשה";
  return "קשה מאוד";
}
