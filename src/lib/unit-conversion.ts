import { formatQuantity, parseLeadingQuantity } from "@/lib/quantity-scaling";

export type UnitSystem = "imperial" | "metric";

type UnitKind = "volume-imperial" | "weight-imperial" | "volume-metric" | "weight-metric";

type UnitDef = {
  aliases: string[];
  kind: UnitKind;
  /** Multiplier to the unit's base (ml for volume, g for weight). */
  toBase: number;
  label: string;
};

// Base units: volume -> ml, weight -> g.
const UNIT_DEFS: UnitDef[] = [
  { aliases: ["cup", "cups", "c", "כוס", "כוסות"], kind: "volume-imperial", toBase: 236.588, label: "כוס" },
  {
    aliases: ["tablespoon", "tablespoons", "tbsp", "tbsp.", "tbs", "כף", "כפות"],
    kind: "volume-imperial",
    toBase: 14.7868,
    label: "כף",
  },
  {
    aliases: ["teaspoon", "teaspoons", "tsp", "tsp.", "כפית", "כפיות"],
    kind: "volume-imperial",
    toBase: 4.92892,
    label: "כפית",
  },
  {
    aliases: ["fl oz", "fl. oz.", "fluid ounce", "fluid ounces"],
    kind: "volume-imperial",
    toBase: 29.5735,
    label: "fl oz",
  },
  {
    aliases: ["ounce", "ounces", "oz", "oz.", "אונקיה", "אונקיות"],
    kind: "weight-imperial",
    toBase: 28.3495,
    label: "אונקיה",
  },
  {
    aliases: ["pound", "pounds", "lb", "lbs", "lb.", "פאונד"],
    kind: "weight-imperial",
    toBase: 453.592,
    label: "פאונד",
  },
  {
    aliases: ["gram", "grams", "g", "gr", "גרם", "גרמים"],
    kind: "weight-metric",
    toBase: 1,
    label: "גרם",
  },
  {
    aliases: ["kilogram", "kilograms", "kg", "ק\"ג", "קילו", "קילוגרם"],
    kind: "weight-metric",
    toBase: 1000,
    label: "ק\"ג",
  },
  {
    aliases: ["milliliter", "milliliters", "millilitre", "ml", "מ\"ל", "מיליליטר"],
    kind: "volume-metric",
    toBase: 1,
    label: "מ\"ל",
  },
  {
    aliases: ["liter", "liters", "litre", "litres", "l", "ליטר"],
    kind: "volume-metric",
    toBase: 1000,
    label: "ליטר",
  },
];

// Approximate grams per US cup for common baking ingredients. Volume-to-weight
// conversion for dry goods is inherently approximate (depends on how the
// ingredient is packed/scooped) — these are reasonable kitchen-reference values.
const DENSITY_G_PER_CUP: Record<string, number> = {
  "all-purpose flour": 125,
  "bread flour": 127,
  "whole wheat flour": 113,
  "קמח": 130,
  flour: 120,
  "granulated sugar": 200,
  "brown sugar": 213,
  "powdered sugar": 120,
  "icing sugar": 120,
  "סוכר חום": 200,
  "אבקת סוכר": 120,
  "סוכר": 200,
  sugar: 200,
  butter: 227,
  "חמאה": 227,
  "cocoa powder": 85,
  "קקאו": 85,
  honey: 340,
  "דבש": 340,
  "maple syrup": 322,
  oats: 90,
  "שיבולת שועל": 90,
  rice: 185,
  "אורז": 185,
  salt: 288,
  "מלח": 288,
  milk: 240,
  "חלב": 240,
  water: 240,
  "מים": 240,
  oil: 218,
  "שמן": 218,
};

function findDensity(ingredientName: string): number | null {
  const lower = ingredientName.toLowerCase();
  for (const [key, grams] of Object.entries(DENSITY_G_PER_CUP)) {
    if (lower.includes(key.toLowerCase())) return grams;
  }
  return null;
}

/** Like findUnit, but returns just the unit's display label instead of its
 * full conversion metadata — for callers that only need to split a unit
 * word off an ingredient line, not convert it. */
export function splitLeadingUnit(text: string): { label: string; rest: string } | null {
  const found = findUnit(text);
  return found ? { label: found.unit.label, rest: found.rest } : null;
}

function findUnit(text: string): { unit: UnitDef; rest: string } | null {
  const lower = text.toLowerCase();
  // Longest alias first so "fl oz" matches before "oz".
  const sorted = [...UNIT_DEFS].sort(
    (a, b) => Math.max(...b.aliases.map((x) => x.length)) - Math.max(...a.aliases.map((x) => x.length)),
  );

  for (const unit of sorted) {
    for (const alias of unit.aliases) {
      const aliasLower = alias.toLowerCase();
      if (lower.startsWith(aliasLower)) {
        const boundary = text[aliasLower.length];
        if (boundary === undefined || /\s|,/.test(boundary)) {
          return { unit, rest: text.slice(alias.length).trimStart() };
        }
      }
    }
  }
  return null;
}

function pickImperialVolumeLabel(ml: number): { value: number; label: string } {
  if (ml < 15) return { value: ml / 4.92892, label: "כפית" };
  if (ml < 55) return { value: ml / 14.7868, label: "כף" };
  return { value: ml / 236.588, label: "כוס" };
}

export function convertIngredientLine(text: string, targetSystem: UnitSystem): string {
  const parsed = parseLeadingQuantity(text);
  if (!parsed) return text;

  const found = findUnit(parsed.rest);
  if (!found) return text;

  const { unit, rest } = found;
  const isImperialUnit = unit.kind.endsWith("imperial");
  if (targetSystem === "imperial" && isImperialUnit) return text;
  if (targetSystem === "metric" && !isImperialUnit) return text;

  const baseValue = parsed.value * unit.toBase;
  const baseRangeEnd = parsed.rangeEnd !== undefined ? parsed.rangeEnd * unit.toBase : undefined;

  function convertOne(base: number): { value: number; label: string } {
    if (targetSystem === "metric") {
      if (unit.kind === "volume-imperial") {
        const density = findDensity(rest);
        if (density) {
          const cups = base / 236.588;
          return { value: cups * density, label: "גרם" };
        }
        if (base >= 1000) return { value: base / 1000, label: "ליטר" };
        return { value: base, label: "מ\"ל" };
      }
      // weight-imperial -> grams/kg
      if (base >= 1000) return { value: base / 1000, label: "ק\"ג" };
      return { value: base, label: "גרם" };
    }

    // targetSystem === "imperial"
    if (unit.kind === "weight-metric") {
      const density = findDensity(rest);
      if (density) return { value: base / density, label: "כוס" };
      if (base >= 453.592) return { value: base / 453.592, label: "פאונד" };
      return { value: base / 28.3495, label: "אונקיה" };
    }
    // volume-metric -> imperial volume
    return pickImperialVolumeLabel(base);
  }

  const converted = convertOne(baseValue);
  const roundedValue =
    converted.label === "גרם" || converted.label === "מ\"ל"
      ? Math.round(converted.value / 5) * 5
      : Math.round(converted.value * 100) / 100;

  if (baseRangeEnd !== undefined) {
    const convertedEnd = convertOne(baseRangeEnd);
    const roundedEnd =
      converted.label === "גרם" || converted.label === "מ\"ל"
        ? Math.round(convertedEnd.value / 5) * 5
        : Math.round(convertedEnd.value * 100) / 100;
    return `${formatQuantity(roundedValue)}–${formatQuantity(roundedEnd)} ${converted.label} ${rest}`.trim();
  }

  return `${formatQuantity(roundedValue)} ${converted.label} ${rest}`.trim();
}

const TEMP_REGEX = /(-?\d+(?:\.\d+)?)\s*°?\s*(F|C|פרנהייט|צלזיוס)\b/gi;

export function convertTemperaturesInText(text: string, targetSystem: UnitSystem): string {
  return text.replace(TEMP_REGEX, (match, num, unitRaw) => {
    const value = Number(num);
    const unit = unitRaw.toUpperCase().startsWith("F") || unitRaw === "פרנהייט" ? "F" : "C";

    if (targetSystem === "metric" && unit === "F") {
      const celsius = Math.round(((value - 32) * 5) / 9);
      return `${celsius}°C`;
    }
    if (targetSystem === "imperial" && unit === "C") {
      const fahrenheit = Math.round((value * 9) / 5 + 32);
      return `${fahrenheit}°F`;
    }
    return match;
  });
}
