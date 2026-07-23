"use client";

import { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, X } from "lucide-react";
import { uploadCoverImage } from "@/lib/upload-cover-image";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Recipe cover image — either a pasted link or a photo uploaded straight
 * from the phone's gallery, with a live preview either way. */
export function ImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">תמונה</label>
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-0.5">
          <button
            type="button"
            onClick={() => setMode("url")}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              mode === "url" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground",
            )}
          >
            <Link2 className="size-3" />
            קישור
          </button>
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
        </div>
      </div>

      {mode === "url" ? (
        <Input
          type="url"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
        />
      ) : (
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
