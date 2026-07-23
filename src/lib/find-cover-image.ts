import type { SupabaseClient } from "@supabase/supabase-js";
import { generateStructuredJson } from "@/lib/ai-generate";
import { searchWeb } from "@/lib/web-search";
import { extractOgTag, fetchHtml, fetchImage } from "@/lib/recipe-scraper";

const QUERY_SCHEMA = {
  type: "object",
  properties: { query: { type: "string" } },
  required: ["query"],
  additionalProperties: false,
} as const;

// Recipe titles are often personal/marketing-y in a way that hurts image
// search — "עוף מהמם בכלום עבודה של שני בתנור עם תפוזים" should search for
// "עוף בתנור עם תפוזים", not the superlatives and the cook's name. Falls
// back to the raw title on any AI failure.
async function cleanSearchQuery(title: string): Promise<string> {
  try {
    const resultText = await generateStructuredJson({
      contents: `שם המתכון: ${title}`,
      systemInstruction:
        "תקבל שם של מתכון, שעשוי לכלול ניסוחים שיווקיים או אישיים שלא עוזרים לחיפוש תמונה " +
        "(סופרלטיבים כמו 'מהמם'/'הכי טעים', ביטויים כמו 'בכלום עבודה', שמות של אנשים וכו'). " +
        "החזר שאילתת חיפוש קצרה ופשוטה שמתארת רק את המנה עצמה — מה שבאמת יביא תוצאות תמונה " +
        "רלוונטיות. שמור על שפת המקור.",
      schema: QUERY_SCHEMA,
    });
    const parsed = JSON.parse(resultText) as { query: string };
    return parsed.query?.trim() || title;
  } catch {
    return title;
  }
}

const BUCKET = "recipe-photos";
const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Best-effort: finds and re-hosts a cover image for a recipe that doesn't
 * have one, based on its title. Returns null (never throws) on any
 * failure — a missing image search shouldn't break the import itself. */
export async function findCoverImageForTitle(
  title: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
): Promise<string | null> {
  if (!title.trim()) return null;

  const query = await cleanSearchQuery(title);

  let results;
  try {
    results = await searchWeb(`${query} תמונה מתכון`, 6);
  } catch {
    return null;
  }

  for (const result of results) {
    try {
      const html = await fetchHtml(result.url);
      const ogImage = extractOgTag(html, "og:image");
      if (!ogImage) continue;

      const image = await fetchImage(ogImage);
      const ext = EXT_BY_CONTENT_TYPE[image.contentType] ?? "jpg";
      const path = `covers/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, image.data, { upsert: false, contentType: image.contentType });
      if (error) continue;

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return publicUrl;
    } catch {
      continue;
    }
  }

  return null;
}
