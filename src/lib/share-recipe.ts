import type { Recipe } from "@/lib/types";
import { formatMinutes } from "@/lib/utils";

/** A clean, WhatsApp-friendly plain-text rendering of a recipe — title,
 * description, times/servings, ingredients, and numbered instructions,
 * plus the source link if there is one. Used for every share channel
 * (native share sheet, WhatsApp, copy to clipboard) so they all produce
 * the same well-formatted result. */
export function formatRecipeForSharing(recipe: Recipe): string {
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  const lines: string[] = [`🍳 *${recipe.title}*`];

  if (recipe.description) {
    lines.push("", recipe.description);
  }

  const meta: string[] = [];
  if (totalTime > 0) meta.push(`⏱️ ${formatMinutes(totalTime)}`);
  if (recipe.servings) meta.push(`🍽️ ${recipe.servings} מנות`);
  if (meta.length > 0) lines.push("", meta.join("   "));

  if (recipe.ingredients.length > 0) {
    lines.push("", "*מרכיבים:*", ...recipe.ingredients.map((i) => `• ${i}`));
  }

  if (recipe.instructions.length > 0) {
    lines.push("", "*הוראות הכנה:*", ...recipe.instructions.map((step, i) => `${i + 1}. ${step}`));
  }

  if (recipe.source_url) {
    lines.push("", recipe.source_url);
  }

  return lines.join("\n");
}

export function shareToWhatsApp(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}
