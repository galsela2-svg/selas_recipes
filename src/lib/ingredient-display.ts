import { formatQuantity, parseLeadingQuantity } from "@/lib/quantity-scaling";
import { splitLeadingUnit } from "@/lib/unit-conversion";

export type SplitIngredient = {
  /** The item itself, e.g. "מלח" — what you'd actually put in the cart. */
  name: string;
  /** e.g. "3 כפות" or just "3" when there's no unit word — null if the
   * line didn't start with a quantity at all (e.g. "מלח לפי הטעם"). */
  quantity: string | null;
};

/** Splits a shopping-list line that came from a recipe ingredient (e.g.
 * "3 כפות מלח") into a display name and a separate quantity, so the app can
 * show "מלח" with "3 כפות" underneath instead of the raw combined line. */
export function splitIngredientQuantity(text: string): SplitIngredient {
  const parsed = parseLeadingQuantity(text);
  if (!parsed) return { name: text, quantity: null };

  const valueLabel =
    parsed.rangeEnd !== undefined
      ? `${formatQuantity(parsed.value)}–${formatQuantity(parsed.rangeEnd)}`
      : formatQuantity(parsed.value);

  const unit = splitLeadingUnit(parsed.rest);
  if (unit) {
    return { name: unit.rest || text, quantity: `${valueLabel} ${unit.label}` };
  }

  // No recognized unit word — the number sits directly before the noun,
  // e.g. "3 ביצים".
  return { name: parsed.rest || text, quantity: valueLabel };
}
