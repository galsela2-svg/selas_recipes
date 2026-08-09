import { parseLeadingQuantity } from "@/lib/quantity-scaling";

// Written-out quantity words that precede an ingredient the same way a
// digit would ("חצי כפית מלח") — parseLeadingQuantity only recognizes
// digits/fractions, so these need their own pass.
const QUANTITY_WORDS = ["שלושת רבעים", "שלושת רבעי", "חצי", "רבע", "שליש", "כמה", "מעט", "קצת", "זוג"];

// Unit/container words that follow a quantity (or stand alone, e.g. "כף
// שמן") — stripping these is what turns "2 כוסות קמח" into "קמח".
const UNIT_WORDS = [
  "כפיות",
  "כפית",
  "כפות",
  "כף",
  "כוסות",
  "כוס",
  "קילוגרמים",
  "קילוגרם",
  "קילו",
  'ק"ג',
  "קג",
  "גרמים",
  "גרם",
  "גר'",
  "מיליליטר",
  'מ"ל',
  "ליטרים",
  "ליטר",
  "יחידות",
  "יחידה",
  "יח'",
  "חבילות",
  "חבילה",
  "קופסאות",
  "קופסה",
  "שקיות",
  "שקית",
  "פרוסות",
  "פרוסה",
  "חתיכות",
  "חתיכה",
  "שיני",
  "שן",
  "חופנים",
  "חופן",
  "בקבוקים",
  "בקבוק",
  "קורט",
  "צרורות",
  "צרור",
  "אגדים",
  "אגד",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Longest-first so e.g. "כפיות" matches whole instead of "כפית" leaving a
// stray "ות" behind.
function toLeadingRegex(words: string[]): RegExp {
  const pattern = [...words].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
  return new RegExp(`^(?:${pattern})(?:\\s+|$)`);
}

const QUANTITY_WORD_REGEX = toLeadingRegex(QUANTITY_WORDS);
const UNIT_REGEX = toLeadingRegex(UNIT_WORDS);

/**
 * Extracts just the product name from a full recipe ingredient line — e.g.
 * "חצי כפית מלח" -> "מלח", "2 כוסות קמח" -> "קמח", "כף שמן זית" -> "שמן
 * זית" — for the shopping-list quick-add suggestions, which should read
 * like products, not recipe instructions. Returns null when the line
 * clearly starts with a quantity/unit but nothing recognizable is left
 * after stripping it, so callers can skip recording a guess rather than
 * suggest something wrong.
 */
export function extractProductName(text: string): string | null {
  let rest = text.trim();
  if (!rest) return null;

  // "כ-2 כפות" ("approximately 2 tbsp") — only strip the כ/כ- prefix when
  // it's actually followed by a digit, so a real word starting with כ
  // (e.g. "כרוב", cabbage) is never touched.
  rest = rest.replace(/^כ-?(?=\d)/, "");

  let sawQuantityOrUnit = false;

  const numeric = parseLeadingQuantity(rest);
  if (numeric) {
    rest = numeric.rest;
    sawQuantityOrUnit = true;
  } else {
    const wordMatch = rest.match(QUANTITY_WORD_REGEX);
    if (wordMatch) {
      rest = rest.slice(wordMatch[0].length).trimStart();
      sawQuantityOrUnit = true;
    }
  }

  const unitMatch = rest.match(UNIT_REGEX);
  if (unitMatch) {
    rest = rest.slice(unitMatch[0].length).trimStart();
    sawQuantityOrUnit = true;
  }

  rest = rest.replace(/^של\s+/, "").trim();

  if (!sawQuantityOrUnit) {
    // No recognizable quantity/unit prefix at all — the line already reads
    // like a plain product name, so it's used unchanged.
    return text.trim();
  }

  // Something was stripped but nothing usable is left (e.g. a bare "2
  // ק"ג" with no product named) — don't guess.
  return rest || null;
}
