"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, X } from "lucide-react";
import {
  useAddRecipePhoto,
  useRecipePhotos,
  useRemoveRecipePhoto,
} from "@/lib/queries/recipe-photos";
import type { RecipePhoto } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RecipePhotoGallery({ recipeId }: { recipeId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: photos } = useRecipePhotos(recipeId);
  const addPhoto = useAddRecipePhoto();
  const removePhoto = useRemoveRecipePhoto();
  const [openPhoto, setOpenPhoto] = useState<RecipePhoto | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    addPhoto.mutate({ recipeId, file });
  }

  function handleDelete(photo: RecipePhoto) {
    setOpenPhoto(null);
    removePhoto.mutate({ recipeId, photo });
  }

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(photos ?? []).map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setOpenPhoto(photo)}
            className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2 cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt=""
              className="size-full object-cover"
              loading="lazy"
            />
          </button>
        ))}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={addPhoto.isPending}
          className="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted transition-colors hover:border-accent hover:text-accent cursor-pointer disabled:opacity-50"
        >
          {addPhoto.isPending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Camera className="size-5" />
          )}
          <span className="text-[11px]">תמונה</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {openPhoto && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
          <div
            className="flex items-center justify-between p-4"
            style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}
          >
            <button
              type="button"
              onClick={() => handleDelete(openPhoto)}
              className="flex size-10 items-center justify-center rounded-full bg-white/10 text-danger cursor-pointer"
            >
              <Trash2 className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setOpenPhoto(null)}
              className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={openPhoto.url}
              alt=""
              className="max-h-full max-w-full rounded-lg object-contain"
            />
            <p className="text-sm text-white/70">{formatDate(openPhoto.taken_at)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
