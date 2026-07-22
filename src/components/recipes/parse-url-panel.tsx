"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Camera, Clapperboard, Link2, NotebookPen } from "lucide-react";
import type { ParsedRecipe } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

function isInstagramUrl(raw: string): boolean {
  try {
    return /(^|\.)instagram\.com$/.test(new URL(raw).hostname);
  } catch {
    return false;
  }
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ParseUrlPanel({
  onParsed,
}: {
  onParsed: (recipe: ParsedRecipe) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [showTextInput, setShowTextInput] = useState(false);
  const [textDraft, setTextDraft] = useState("");
  const [textLoading, setTextLoading] = useState(false);

  async function handleSubmit() {
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

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPhotoLoading(true);
    setError(null);
    setNotice(null);

    try {
      const base64 = await readFileAsBase64(file);
      const res = await fetch("/api/parse-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, media_type: file.type }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "לא הצלחנו לזהות מתכון בתמונה.");

      const parsed = body as ParsedRecipe;
      onParsed(parsed);
      setNotice("סרקנו את התמונה וחילצנו מתכון — כדאי לעבור עליו ולוודא שהוא מדויק.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setPhotoLoading(false);
    }
  }

  async function handleTextSubmit() {
    const trimmed = textDraft.trim();
    if (!trimmed) return;

    setTextLoading(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "לא הצלחנו לארגן את המתכון.");

      const parsed = body as ParsedRecipe;
      onParsed(parsed);
      setNotice("ארגנו את המתכון לפורמט — כדאי לעבור עליו ולוודא שהוא מדויק.");
      setTextDraft("");
      setShowTextInput(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setTextLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/10 via-surface to-surface p-5 shadow-sm">
      <div className="mb-3.5 flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-sm">
          <Clapperboard className="size-5" />
        </div>
        <div>
          <p className="font-serif text-lg font-bold leading-tight text-foreground">
            ראיתם מתכון ברילז?
          </p>
          <p className="text-xs text-muted">הדביקו את הקישור ואנחנו נהפוך אותו למתכון שמור</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Input
          type="url"
          dir="ltr"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="instagram.com/reel/... או קישור לכל אתר מתכונים"
        />
        <Button type="button" size="lg" className="w-full" loading={loading} onClick={handleSubmit}>
          <Link2 className="size-4" />
          פענוח המתכון
        </Button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={photoLoading}
          className="flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground cursor-pointer disabled:opacity-50"
        >
          <Camera className="size-3.5" />
          {photoLoading ? "סורק תמונה..." : "צלמו עמוד מספר בישול"}
        </button>
        <button
          type="button"
          onClick={() => setShowTextInput((prev) => !prev)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground cursor-pointer"
        >
          <NotebookPen className="size-3.5" />
          הדביקו מתכון כטקסט
        </button>
      </div>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoChange}
        className="hidden"
      />

      {showTextInput && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          <Textarea
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            placeholder={"הדביקו כאן מתכון שלם כטקסט חופשי (מהודעה, מסמך וכו') —\nואנחנו נסדר אותו לכותרת, מרכיבים ושלבי הכנה."}
            rows={6}
          />
          <Button
            type="button"
            variant="secondary"
            loading={textLoading}
            onClick={handleTextSubmit}
            disabled={!textDraft.trim()}
          >
            <NotebookPen className="size-4" />
            סידור המתכון
          </Button>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      {notice && <p className="mt-3 text-xs text-accent">{notice}</p>}
    </div>
  );
}
