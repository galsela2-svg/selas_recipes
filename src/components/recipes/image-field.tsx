"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadCoverImage } from "@/lib/upload-cover-image";

/** Recipe cover image — a photo uploaded straight from the phone's gallery,
 * with a live preview. */
export function ImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
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
      <label className="text-sm font-medium text-foreground">תמונה</label>

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
