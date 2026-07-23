"use client";

import { useState, type KeyboardEvent } from "react";
import { Clapperboard, Link2, NotebookPen } from "lucide-react";
import type { ParsedRecipe } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ImportMode = "url" | "text";

const MODE_TABS: { id: ImportMode; label: string; icon: typeof Link2 }[] = [
  { id: "url", label: "קישור", icon: Link2 },
  { id: "text", label: "טקסט", icon: NotebookPen },
];

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
  const [mode, setMode] = useState<ImportMode>("text");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"info" | "success">("info");

  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);

  const [textDraft, setTextDraft] = useState("");
  const [textLoading, setTextLoading] = useState(false);

  function switchMode(next: ImportMode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setNoticeTone("info");
  }

  async function handleUrlSubmit() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setUrlLoading(true);
    setError(null);
    setNotice(null);
    setNoticeTone("info");

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
      } else {
        setNoticeTone("success");
        setNotice("המתכון פוענח בהצלחה! כדאי לעבור עליו ולוודא שהוא מדויק.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setUrlLoading(false);
    }
  }

  async function handleTextSubmit() {
    const trimmed = textDraft.trim();
    if (!trimmed) return;

    setTextLoading(true);
    setError(null);
    setNotice(null);
    setNoticeTone("info");

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
      setNoticeTone("success");
      setNotice("המתכון סודר בהצלחה! כדאי לעבור עליו ולוודא שהוא מדויק.");
      setTextDraft("");
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
            יבוא מתכון
          </p>
          <p className="text-xs text-muted">מקישור (כולל רילז) או מטקסט חופשי</p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-surface p-1">
        {MODE_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchMode(id)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium cursor-pointer transition-colors",
              mode === id ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {mode === "url" && (
        <div className="flex flex-col gap-2">
          <Input
            type="url"
            dir="ltr"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleUrlSubmit();
              }
            }}
            placeholder="instagram.com/reel/... או קישור לכל אתר מתכונים"
          />
          <p className="text-xs text-muted">
            הדביקו קישור לרילז/פוסט באינסטגרם או לעמוד מתכון בכל אתר בישול.
          </p>
          <Button
            type="button"
            size="lg"
            className="w-full"
            loading={urlLoading}
            disabled={!url.trim()}
            onClick={handleUrlSubmit}
          >
            <Link2 className="size-4" />
            פענוח המתכון
          </Button>
        </div>
      )}

      {mode === "text" && (
        <div className="flex flex-col gap-2">
          <Textarea
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            placeholder={"הדביקו כאן מתכון שלם כטקסט חופשי (מהודעה, מסמך וכו') —\nואנחנו נסדר אותו לכותרת, מרכיבים ושלבי הכנה."}
            rows={6}
          />
          <Button
            type="button"
            size="lg"
            className="w-full"
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
      {notice && (
        <p className={cn("mt-3 text-xs", noticeTone === "success" ? "text-success" : "text-accent")}>
          {notice}
        </p>
      )}
    </div>
  );
}
