"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Search, X } from "lucide-react";
import { uploadCoverImage } from "@/lib/upload-cover-image";
import type { ImageSearchResult } from "@/app/api/search-images/route";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Recipe cover image — either a photo uploaded straight from the phone's
 * gallery, or one picked from a web image search, with a live preview
 * either way. No raw-URL paste — the previous option was confusing next to
 * these two more concrete ones. */
export function ImageField({
  value,
  onChange,
  defaultSearchQuery,
}: {
  value: string;
  onChange: (url: string) => void;
  /** Pre-fills the web-search box (e.g. the recipe's own title), so you
   * don't have to retype it before searching. */
  defaultSearchQuery?: string;
}) {
  const [mode, setMode] = useState<"upload" | "search">("upload");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(defaultSearchQuery ?? "");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ImageSearchResult[] | null>(null);
  const [importingUrl, setImportingUrl] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const url = await uploadCoverImage(file);
      onChange(url);
    } catch {
      setError("ההעלאה נכשלה. נסו שוב.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch(`/api/search-images?q=${encodeURIComponent(query.trim())}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "החיפוש נכשל.");
      setResults(body.images as ImageSearchResult[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setSearching(false);
    }
  }

  // Picking a result doesn't use its URL directly — a lot of sites block
  // hotlinked <img> requests from other origins, which would silently leave
  // the recipe with a "picked" image that never actually renders. Instead
  // the server downloads it and re-hosts it in our own storage, the same
  // place gallery uploads land.
  async function handlePickResult(imageUrl: string) {
    setImportingUrl(imageUrl);
    setError(null);
    try {
      const res = await fetch("/api/import-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: imageUrl }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "לא הצלחנו לשמור את התמונה.");
      onChange(body.url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setImportingUrl(null);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">תמונה</label>
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-0.5">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              mode === "upload" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground",
            )}
          >
            <ImagePlus className="size-3" />
            מהגלריה
          </button>
          <button
            type="button"
            onClick={() => setMode("search")}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              mode === "search" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground",
            )}
          >
            <Search className="size-3" />
            חיפוש באינטרנט
          </button>
        </div>
      </div>

      {mode === "upload" ? (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-foreground cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            {uploading ? "מעלה תמונה..." : "בחירת תמונה מהגלריה"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </>
      ) : (
        <div className="space-y-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="לדוגמה: עוגת שוקולד"
              className="flex-1"
            />
            <Button type="submit" size="md" loading={searching}>
              <Search className="size-4" />
            </Button>
          </form>

          {searching && (
            <div className="flex items-center justify-center py-6 text-sm text-muted">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}

          {results && results.length === 0 && !searching && (
            <p className="py-2 text-center text-xs text-muted">לא נמצאו תמונות. נסו נושא אחר.</p>
          )}

          {results && results.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {results.map((image) => {
                const isImporting = importingUrl === image.imageUrl;
                return (
                  <button
                    key={image.imageUrl}
                    type="button"
                    onClick={() => handlePickResult(image.imageUrl)}
                    disabled={isImporting}
                    title={image.title}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-lg border-2 cursor-pointer disabled:cursor-wait",
                      value === image.imageUrl ? "border-accent" : "border-transparent hover:border-accent/50",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.imageUrl} alt={image.title} className="size-full object-cover" />
                    {isImporting && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="size-5 animate-spin text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      {value && (
        <div className="relative h-32 w-full overflow-hidden rounded-lg bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="size-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute end-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/50 text-white cursor-pointer hover:bg-black/70"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
