"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Camera, Clapperboard, Link2, Loader2, NotebookPen } from "lucide-react";
import type { ParsedRecipe } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ImportMode = "url" | "photo" | "text";

const MODE_TABS: { id: ImportMode; label: string; icon: typeof Link2 }[] = [
  { id: "url", label: "קישור", icon: Link2 },
  { id: "photo", label: "תמונה", icon: Camera },
  { id: "text", label: "טקסט", icon: NotebookPen },
];

function isInstagramUrl(raw: string): boolean {
  try {
    return /(^|\.)instagram\.com$/.test(new URL(raw).hostname);
  } catch {
    return false;
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:image/jpeg;base64," prefix — only the raw base64
      // payload is sent to the API.
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function RecipeImportPanel({
  onParsed,
}: {
  onParsed: (recipe: ParsedRecipe) => void;
}) {
  const [mode, setMode] = useState<ImportMode>("text");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);

  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [textDraft, setTextDraft] = useState("");
  const [textLoading, setTextLoading] = useState(false);

  function switchMode(next: ImportMode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function handleUrlSubmit() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setUrlLoading(true);
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

      const parsed = (instagram ? body.recipe : body) as ParsedRecipe;
      onParsed(parsed);

      if (parsed.ingredients.length === 0 && parsed.instructions.length === 0) {
        setNotice(
          "מילאנו את הכותרת והתמונה, אבל לא הצלחנו לזהות מרכיבים או הוראות הכנה. השלימו אותם ידנית למטה.",
        );
      } else {
        setNotice("המתכון פוענח בהצלחה! כדאי לעבור עליו ולוודא שהוא מדויק.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setUrlLoading(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setNotice(null);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoLoading(true);

    try {
      const imageBase64 = await fileToBase64(file);
      const mimeType = file.type || "image/jpeg";
      const res = await fetch("/api/parse-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64, mimeType }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "לא הצלחנו לפענח את התמונה.");

      const parsed = body as ParsedRecipe;
      onParsed(parsed);
      setNotice("המתכון פוענח בהצלחה מהתמונה! כדאי לעבור עליו ולוודא שהוא מדויק.");
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
          <p className="text-xs text-muted">מקישור, מתמונה, או מטקסט חופשי — ואנחנו נסדר אותו</p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-1.5 rounded-xl border border-border bg-surface p-1">
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

      {mode === "photo" && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={photoLoading}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-6 text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-foreground cursor-pointer disabled:opacity-50"
          >
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="" className="h-24 rounded-md object-cover" />
            ) : photoLoading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <Camera className="size-6" />
            )}
            {photoLoading ? "קוראים את המתכון מהתמונה..." : "צילום או בחירת תמונה"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <p className="text-xs text-muted">
            עמוד מספר בישול, כרטיסיית מתכון כתובה ביד, או צילום מסך — ואנחנו נסדר לכם כותרת, מרכיבים ושלבי הכנה.
          </p>
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
      {notice && <p className="mt-3 text-xs text-success">{notice}</p>}
    </div>
  );
}
