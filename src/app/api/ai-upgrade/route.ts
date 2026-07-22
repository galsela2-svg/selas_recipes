import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropicErrorResponse } from "@/lib/ai-error";

const client = new Anthropic();

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    variations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["title", "description"],
        additionalProperties: false,
      },
    },
    substitutions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original: { type: "string" },
          substitute: { type: "string" },
          reason: { type: "string" },
        },
        required: ["original", "substitute", "reason"],
        additionalProperties: false,
      },
    },
    enhancements: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["variations", "substitutions", "enhancements"],
  additionalProperties: false,
} as const;

type AiUpgradeResult = {
  variations: { title: string; description: string }[];
  substitutions: { original: string; substitute: string; reason: string }[];
  enhancements: string[];
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "יש להתחבר." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const recipe = body?.recipe;

  if (!recipe?.title || !Array.isArray(recipe?.ingredients)) {
    return NextResponse.json({ error: "נתוני מתכון חסרים." }, { status: 400 });
  }

  const recipeDescription = [
    `כותרת: ${recipe.title}`,
    recipe.description ? `תיאור: ${recipe.description}` : null,
    `מרכיבים:\n${(recipe.ingredients as string[]).map((i) => `- ${i}`).join("\n")}`,
    `הוראות הכנה:\n${(recipe.instructions as string[]).map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}`,
    recipe.tags?.length ? `תגיות: ${(recipe.tags as string[]).join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: RESPONSE_SCHEMA },
      },
      system:
        "אתה שף ותזונאי מומחה. תפקידך לשדרג מתכונים: להציע גרסאות יצירתיות, תחליפים בריאים " +
        "(כגון הגברת חלבון או הפחתת פחמימות), ושיפורי טעם. ענה בעברית בלבד, בקצרה ובאופן מעשי.",
      messages: [
        {
          role: "user",
          content:
            `הנה מתכון. הצע/י:\n` +
            `1. 2-3 גרסאות יצירתיות של המתכון (וריאציות בטעם/סגנון).\n` +
            `2. תחליפים בריאים למרכיבים מסוימים (עם הסבר קצר לכל תחליף).\n` +
            `3. 2-4 טיפים לשיפור הטעם.\n\n${recipeDescription}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text content in response");
    }

    const parsed = JSON.parse(textBlock.text) as AiUpgradeResult;
    return NextResponse.json(parsed);
  } catch (err) {
    const anthropicError = anthropicErrorResponse(
      err,
      "פיצ'ר השדרוג בעזרת AI דורש הגדרת משתנה הסביבה ANTHROPIC_API_KEY בשרת (ב-.env.local לפיתוח מקומי, או בהגדרות הפרויקט ב-Vercel לגרסה הפרוסה).",
    );
    if (anthropicError) {
      return NextResponse.json({ error: anthropicError.error }, { status: anthropicError.status });
    }
    return NextResponse.json({ error: "משהו השתבש. נסו שוב." }, { status: 500 });
  }
}
