import { splitIngredientQuantity } from "@/lib/ingredient-display";

export type IngredientMention = {
  start: number;
  end: number;
  name: string;
  quantity: string;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Finds every place an instruction step mentions one of the recipe's
 * ingredients, so the step can show that ingredient's quantity as a small
 * annotation right above the word — e.g. "שום" gets "3 שיניים" above it in
 * cooking mode. Matches are Hebrew-prefix-tolerant on the left (מ/ה/ו/ל/ב/כ/ש
 * attach directly to the word with no space, e.g. "השום" still matches
 * "שום"), but must not be immediately followed by another Hebrew letter on
 * the right, so a short name like "שום" doesn't match inside an unrelated
 * word like "שומן". */
export function findIngredientMentions(text: string, ingredients: string[]): IngredientMention[] {
  const candidates: IngredientMention[] = [];

  for (const ingredient of ingredients) {
    const { name, quantity } = splitIngredientQuantity(ingredient);
    const trimmedName = name.trim();
    if (!quantity || trimmedName.length < 2) continue;

    const regex = new RegExp(`${escapeRegExp(trimmedName)}(?![א-ת])`, "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text))) {
      candidates.push({
        start: match.index,
        end: match.index + trimmedName.length,
        name: trimmedName,
        quantity,
      });
    }
  }

  // Longer names are more specific — prefer them over a shorter name whose
  // match range they fully contain (e.g. "בצל ירוק" over a bare "בצל").
  candidates.sort((a, b) => b.name.length - a.name.length || a.start - b.start);

  const selected: IngredientMention[] = [];
  for (const candidate of candidates) {
    const overlaps = selected.some((s) => candidate.start < s.end && s.start < candidate.end);
    if (!overlaps) selected.push(candidate);
  }

  return selected.sort((a, b) => a.start - b.start);
}
