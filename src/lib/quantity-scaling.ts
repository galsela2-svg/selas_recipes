// Parses and scales the leading numeric quantity of an ingredient line —
// e.g. "1 1/2 cups flour", "2-3 cloves garlic", "½ tsp salt", "1.5 kg potatoes".

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

const UNICODE_FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join("");

const NICE_FRACTIONS: Array<[number, string]> = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [7 / 8, "⅞"],
];

const TOKEN = `(?:\\d+\\s+\\d+\\/\\d+|\\d+[${UNICODE_FRACTION_CHARS}]|\\d+\\/\\d+|\\d+(?:\\.\\d+)?|[${UNICODE_FRACTION_CHARS}])`;
const RANGE_SEP = `\\s*(?:-|–|—|to)\\s*`;
const LEADING_REGEX = new RegExp(`^(${TOKEN})(?:${RANGE_SEP}(${TOKEN}))?(?=\\s|$)`);

function parseToken(token: string): number | null {
  const t = token.trim();
  if (t.length === 0) return null;

  if (t.length === 1 && t in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[t];

  const mixedUnicode = t.match(new RegExp(`^(\\d+)([${UNICODE_FRACTION_CHARS}])$`));
  if (mixedUnicode) return Number(mixedUnicode[1]) + UNICODE_FRACTIONS[mixedUnicode[2]];

  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);

  const fraction = t.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);

  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);

  return null;
}

export type ParsedQuantity = {
  value: number;
  rangeEnd?: number;
  rest: string;
};

export function parseLeadingQuantity(text: string): ParsedQuantity | null {
  const trimmed = text.trimStart();
  const match = trimmed.match(LEADING_REGEX);
  if (!match) return null;

  const value = parseToken(match[1]);
  if (value === null) return null;

  const rangeEnd = match[2] ? (parseToken(match[2]) ?? undefined) : undefined;
  const rest = trimmed.slice(match[0].length).trimStart();

  return { value, rangeEnd, rest };
}

export function formatQuantity(value: number): string {
  if (value <= 0) return "0";

  const whole = Math.floor(value + 1e-9);
  const frac = value - whole;

  if (frac < 0.02) return String(whole);

  let best: [number, string] | null = null;
  let bestDiff = Infinity;
  for (const entry of NICE_FRACTIONS) {
    const diff = Math.abs(frac - entry[0]);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = entry;
    }
  }

  if (best && bestDiff < 0.03) {
    return whole > 0 ? `${whole}${best[1]}` : best[1];
  }

  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

export function scaleIngredientText(text: string, multiplier: number): string {
  if (!Number.isFinite(multiplier) || multiplier === 1) return text;

  const parsed = parseLeadingQuantity(text);
  if (!parsed) return text;

  const scaledValue = formatQuantity(parsed.value * multiplier);

  if (parsed.rangeEnd !== undefined) {
    const scaledEnd = formatQuantity(parsed.rangeEnd * multiplier);
    return `${scaledValue}–${scaledEnd} ${parsed.rest}`.trim();
  }

  return `${scaledValue} ${parsed.rest}`.trim();
}
