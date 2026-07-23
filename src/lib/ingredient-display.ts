import { formatQuantity, parseLeadingQuantity } from "@/lib/quantity-scaling";
import { splitLeadingUnit } from "@/lib/unit-conversion";

export type SplitIngredient = {
  /** The item itself, e.g. "מלח" — what you'd actually put in the cart. */
  name: string;
  /** e.g. "3 כפות" or just "3" when there's no unit word — null if the
   * line didn't start with a quantity at all (e.g. "מלח לפי הטעם"). */
  quantity: string | null;
};

// Hebrew ways of writing a quantity without a digit at all — "חצי כף" (half
// a tablespoon), "שליש כוס" (a third of a cup) — checked longest-phrase
// first so "שלושת רבעי" wins over a bare "רבע" inside it, etc.
const FRACTION_WORDS: [string, number][] = [
  ["שלושת רבעי", 0.75],
  ["שני שליש", 2 / 3],
  ["חצי", 0.5],
  ["שליש", 1 / 3],
  ["רבע", 0.25],
];

function matchLeadingFractionWord(text: string): { value: number; rest: string } | null {
  const trimmed = text.trimStart();
  for (const [word, value] of FRACTION_WORDS) {
    if (!trimmed.startsWith(word)) continue;
    const boundary = trimmed[word.length];
    if (boundary !== undefined && !/\s/.test(boundary)) continue;
    return { value, rest: trimmed.slice(word.length).trimStart() };
  }
  return null;
}

// "X וחצי" — "כף וחצי" (a tablespoon and a half), "2 כוסות וחצי" (2.5 cups)
// — adds half a unit on top of whatever count precedes it (implicitly 1,
// if there's no explicit number before the unit).
const TRAILING_HALF_REGEX = /^ו?חצי(?=\s|$)/;

function finishSplit(value: number, rest: string, original: string): SplitIngredient {
  const unit = splitLeadingUnit(rest);
  let finalValue = value;
  let finalRest = unit ? unit.rest : rest;

  if (TRAILING_HALF_REGEX.test(finalRest)) {
    finalValue += 0.5;
    finalRest = finalRest.replace(TRAILING_HALF_REGEX, "").trimStart();
  }

  const quantity = unit ? `${formatQuantity(finalValue)} ${unit.label}` : formatQuantity(finalValue);
  return { name: finalRest || original, quantity };
}

/** Splits a shopping-list line that came from a recipe ingredient (e.g.
 * "3 כפות מלח", "חצי כוס קמח", "כף וחצי סוכר") into a display name and a
 * separate quantity, so the app can show "מלח" with "3 כפות" underneath
 * instead of the raw combined line. */
export function splitIngredientQuantity(text: string): SplitIngredient {
  const leadingWord = matchLeadingFractionWord(text);
  if (leadingWord) return finishSplit(leadingWord.value, leadingWord.rest, text);

  const parsed = parseLeadingQuantity(text);
  if (parsed) {
    if (parsed.rangeEnd !== undefined) {
      // Ranges keep their existing simple behavior — combining a range
      // with "וחצי" isn't a real-world phrasing worth handling.
      const valueLabel = `${formatQuantity(parsed.value)}–${formatQuantity(parsed.rangeEnd)}`;
      const unit = splitLeadingUnit(parsed.rest);
      return unit
        ? { name: unit.rest || text, quantity: `${valueLabel} ${unit.label}` }
        : { name: parsed.rest || text, quantity: valueLabel };
    }
    return finishSplit(parsed.value, parsed.rest, text);
  }

  // No digit and no leading fraction word — still check for a bare
  // "<unit> וחצי" with an implicit count of 1, e.g. "כף וחצי מלח".
  const unit = splitLeadingUnit(text);
  if (unit && TRAILING_HALF_REGEX.test(unit.rest)) {
    const rest = unit.rest.replace(TRAILING_HALF_REGEX, "").trimStart();
    return { name: rest || text, quantity: `${formatQuantity(1.5)} ${unit.label}` };
  }

  return { name: text, quantity: null };
}
