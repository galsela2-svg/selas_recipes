import type { ParsedRecipe } from "@/lib/types";

type JsonLdNode = Record<string, unknown>;

// A realistic browser UA. Identifying as a bot (the previous
// "RecipeAppBot/1.0" string) gets silently blocked by most anti-bot
// vendors (PerimeterX, Akamai, etc.) used by large recipe sites.
export const BROWSER_LIKE_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "he,en-US;q=0.9,en;q=0.8",
};

export class FetchBlockedError extends Error {
  status: number;
  constructor(status: number) {
    super(`Blocked with status ${status}`);
    this.status = status;
  }
}

export class FetchFailedError extends Error {
  status: number;
  constructor(status: number) {
    super(`Request failed with status ${status}`);
    this.status = status;
  }
}

export async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: BROWSER_LIKE_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    if ([401, 402, 403, 429, 451].includes(response.status)) {
      throw new FetchBlockedError(response.status);
    }
    throw new FetchFailedError(response.status);
  }

  return response.text();
}

function stripHtml(value: string): string {
  return value
    .replace(/<\/?[a-z][^>]*>/gi, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#x27;|&apos;/gi, "'")
    .replace(/&quot;|&#x22;/gi, '"')
    .replace(/&#8217;|&#x2019;/gi, "’")
    .replace(/\s+/g, " ")
    .trim();
}

function extractJsonLdBlocks(html: string): JsonLdNode[] {
  const blocks: JsonLdNode[] = [];
  const regex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html))) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item && typeof item === "object") {
          if (Array.isArray((item as JsonLdNode)["@graph"])) {
            blocks.push(...((item as JsonLdNode)["@graph"] as JsonLdNode[]));
          } else {
            blocks.push(item as JsonLdNode);
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks and keep scanning.
    }
  }

  return blocks;
}

function isRecipeNode(node: JsonLdNode): boolean {
  const type = node["@type"];
  if (typeof type === "string") return type.toLowerCase() === "recipe";
  if (Array.isArray(type)) {
    return type.some((t) => typeof t === "string" && t.toLowerCase() === "recipe");
  }
  return false;
}

function findRecipeNode(blocks: JsonLdNode[]): JsonLdNode | null {
  return blocks.find(isRecipeNode) ?? null;
}

function toStringField(value: unknown): string | null {
  if (typeof value === "string") return stripHtml(value);
  if (Array.isArray(value) && typeof value[0] === "string") {
    return stripHtml(value[0]);
  }
  if (value && typeof value === "object") {
    const name = (value as JsonLdNode).name;
    if (typeof name === "string") return stripHtml(name);
    const url = (value as JsonLdNode).url;
    if (typeof url === "string") return url;
  }
  return null;
}

function parseIsoDurationToMinutes(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return null;

  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const total = days * 24 * 60 + hours * 60 + minutes;
  return total > 0 ? total : null;
}

function parseServings(value: unknown): number | null {
  const source = Array.isArray(value) ? value[0] : value;
  if (typeof source === "number") return Math.round(source);
  if (typeof source === "string") {
    const match = source.match(/\d+/);
    if (match) return Number(match[0]);
  }
  return null;
}

function parseIngredients(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map(stripHtml)
    .filter(Boolean);
}

function flattenInstructionNode(node: unknown): string[] {
  if (typeof node === "string") {
    const text = stripHtml(node);
    return text ? [text] : [];
  }

  if (Array.isArray(node)) {
    return node.flatMap(flattenInstructionNode);
  }

  if (node && typeof node === "object") {
    const obj = node as JsonLdNode;
    const type = obj["@type"];

    if (type === "HowToSection" && Array.isArray(obj.itemListElement)) {
      return flattenInstructionNode(obj.itemListElement);
    }

    if (typeof obj.text === "string") {
      const text = stripHtml(obj.text);
      return text ? [text] : [];
    }

    if (typeof obj.name === "string") {
      const text = stripHtml(obj.name);
      return text ? [text] : [];
    }
  }

  return [];
}

function parseInstructions(value: unknown): string[] {
  return flattenInstructionNode(value).filter(Boolean);
}

function parseImage(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return parseImage(value[0]);
  if (value && typeof value === "object") {
    const url = (value as JsonLdNode).url;
    if (typeof url === "string") return url;
  }
  return null;
}

export function extractOgTag(html: string, property: string): string | null {
  const regex = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const match = html.match(regex);
  return match ? stripHtml(match[1]) : null;
}

function extractTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? stripHtml(match[1]) : null;
}

// Fallback for older/simpler sites that mark up recipes with schema.org
// microdata (itemprop="...") instead of JSON-LD.
function extractMicrodataItems(html: string, itemprop: string): string[] {
  const containerRegex = new RegExp(
    `<([a-z0-9]+)[^>]*itemprop=["']${itemprop}["'][^>]*>([\\s\\S]*?)<\\/\\1>`,
    "gi",
  );
  const results: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = containerRegex.exec(html))) {
    const inner = match[2];
    const subItems = [...inner.matchAll(/<(?:li|p)[^>]*>([\s\S]*?)<\/(?:li|p)>/gi)]
      .map((m) => stripHtml(m[1]))
      .filter(Boolean);

    if (subItems.length > 1) {
      results.push(...subItems);
    } else {
      const text = stripHtml(inner);
      if (text) results.push(text);
    }
  }

  return results;
}

export function parseRecipeFromHtml(
  html: string,
  sourceUrl: string,
): ParsedRecipe | null {
  const blocks = extractJsonLdBlocks(html);
  const node = findRecipeNode(blocks);

  const title =
    (node && toStringField(node.name)) ||
    extractOgTag(html, "og:title") ||
    extractTitleTag(html);

  let ingredients = node ? parseIngredients(node.recipeIngredient) : [];
  let instructions = node ? parseInstructions(node.recipeInstructions) : [];

  if (ingredients.length === 0) {
    ingredients = extractMicrodataItems(html, "recipeIngredient");
  }
  if (instructions.length === 0) {
    instructions =
      extractMicrodataItems(html, "recipeInstructions").length > 0
        ? extractMicrodataItems(html, "recipeInstructions")
        : extractMicrodataItems(html, "recipeInstruction");
  }

  // Treat it as a genuine recipe page if we found structured Recipe data
  // (JSON-LD or microdata), even if we could only partially parse it —
  // better to prefill what we found than fail outright.
  const foundRecipeSignal =
    Boolean(node) || ingredients.length > 0 || instructions.length > 0;

  if (!title || !foundRecipeSignal) {
    return null;
  }

  return {
    title,
    description: node ? toStringField(node.description) : extractOgTag(html, "og:description"),
    image_url: (node && parseImage(node.image)) || extractOgTag(html, "og:image"),
    source_url: sourceUrl,
    prep_time_minutes: node ? parseIsoDurationToMinutes(node.prepTime) : null,
    cook_time_minutes: node ? parseIsoDurationToMinutes(node.cookTime) : null,
    servings: node ? parseServings(node.recipeYield) : null,
    ingredients,
    instructions,
  };
}
