"use client";

import { useState, type FormEvent } from "react";
import { Clapperboard, Sparkles } from "lucide-react";
import type { ParsedRecipe } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function isInstagramUrl(raw: string): boolean {
  try {
    return /(^|\.)instagram\.com$/.test(new URL(raw).hostname);
  } catch {
    return false;
  }
}

export function ParseUrlPanel({
  onParsed,
}: {
  onParsed: (recipe: ParsedRecipe) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setLoading(true);
    setError(null);
    setNotice(null);

    const instagram = isInstagramUrl(trimmedUrl);
    const endpoint = instagram ? "/api/parse-instagram" : "/api/parse-recipe";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || "לא הצלחנו לפענח את הדף הזה.");
      }

      if (instagram) {
        const parsed = body.recipe as ParsedRecipe;
        onParsed(parsed);
        setNotice(
          body.fallback
            ? `לא נמצא מתכון ברור בפוסט האינסטגרם — מילאנו במקום זאת את המתכון הקרוב ביותר שמצאנו באינטרנט (חיפוש: "${body.fallbackQuery}"). בדקו שהוא מתאים.`
            : "חילצנו את המתכון מהכיתוב של הפוסט — כדאי לעבור עליו ולוודא שהוא מדויק.",
        );
        return;
      }

      const parsed = body as ParsedRecipe;
      onParsed(parsed);

      if (parsed.ingredients.length === 0 && parsed.instructions.length === 0) {
        setNotice(
          "מילאנו את הכותרת והתמונה, אבל לא הצלחנו לזהות מרכיבים או הוראות הכנה. השלימו אותם ידנית למטה.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-accent/40 bg-accent/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="size-4 text-accent" />
        פענוח מקישור
      </div>
      <p className="mb-3 text-xs text-muted">
        הדביקו קישור למתכון (או ריל אינסטגרם) ואנחנו נשלוף עבורכם את הפרטים לבדיקה.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="url"
          dir="ltr"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/recipe או instagram.com/reel/..."
          className="flex-1"
        />
        <Button type="submit" variant="secondary" loading={loading}>
          {isInstagramUrl(url) ? <Clapperboard className="size-4" /> : null}
          פענוח
        </Button>
      </form>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {notice && <p className="mt-2 text-xs text-accent">{notice}</p>}
    </div>
  );
}
