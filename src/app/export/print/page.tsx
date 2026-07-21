"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { useRecipes } from "@/lib/queries/recipes";
import { useRecipePhotos } from "@/lib/queries/recipe-photos";
import { formatMinutes } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

function PrintRecipePhotos({ recipeId }: { recipeId: string }) {
  const { data: photos } = useRecipePhotos(recipeId);
  if (!photos || photos.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2 break-inside-avoid">
      {photos.map((photo) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={photo.id}
          src={photo.url}
          alt=""
          className="size-24 rounded-lg object-cover"
        />
      ))}
    </div>
  );
}

function PrintCookbook() {
  const searchParams = useSearchParams();
  const { data: recipes, isLoading } = useRecipes();
  const hasPrinted = useRef(false);

  const ids = (searchParams.get("ids") ?? "").split(",").filter(Boolean);
  const includeImages = searchParams.get("images") !== "0";
  const selected = (recipes ?? []).filter((r) => ids.includes(r.id));

  useEffect(() => {
    if (!isLoading && selected.length > 0 && !hasPrinted.current) {
      hasPrinted.current = true;
      setTimeout(() => window.print(), 400);
    }
  }, [isLoading, selected.length]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <p className="text-sm text-muted">תצוגה מקדימה להדפסה</p>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="size-4" />
          הדפסה / שמירה כ-PDF
        </Button>
      </div>

      <article className="mx-auto max-w-3xl px-8 py-10 print:px-0 print:py-0">
        <section className="flex min-h-[70vh] flex-col items-center justify-center break-after-page text-center">
          <h1 className="text-4xl font-bold">ספר המתכונים שלנו</h1>
          <p className="mt-3 text-sm text-neutral-500">
            {new Date().toLocaleDateString("he-IL", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {selected.length} מתכונים
          </p>
        </section>

        {selected.map((recipe, index) => {
          const totalTime =
            (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

          return (
            <section
              key={recipe.id}
              className={
                index < selected.length - 1
                  ? "break-after-page py-6"
                  : "py-6"
              }
            >
              <h2 className="mb-2 text-2xl font-bold">{recipe.title}</h2>

              {recipe.description && (
                <p className="mb-3 text-sm text-neutral-600">
                  {recipe.description}
                </p>
              )}

              <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                {totalTime > 0 && <span>זמן הכנה: {formatMinutes(totalTime)}</span>}
                {recipe.servings && <span>מנות: {recipe.servings}</span>}
                {recipe.tags.length > 0 && (
                  <span>תגיות: {recipe.tags.join(", ")}</span>
                )}
              </div>

              {includeImages && recipe.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={recipe.image_url}
                  alt=""
                  className="mb-4 max-h-72 w-full rounded-lg object-cover"
                />
              )}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="break-inside-avoid sm:col-span-1">
                  <h3 className="mb-2 font-semibold">מרכיבים</h3>
                  <ul className="space-y-1 text-sm">
                    {recipe.ingredients.map((ingredient, i) => (
                      <li key={i}>• {ingredient}</li>
                    ))}
                  </ul>
                </div>
                <div className="break-inside-avoid sm:col-span-2">
                  <h3 className="mb-2 font-semibold">הוראות הכנה</h3>
                  <ol className="space-y-1.5 text-sm">
                    {recipe.instructions.map((step, i) => (
                      <li key={i}>
                        {i + 1}. {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {includeImages && <PrintRecipePhotos recipeId={recipe.id} />}
            </section>
          );
        })}
      </article>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}

export default function ExportPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Spinner />
        </div>
      }
    >
      <PrintCookbook />
    </Suspense>
  );
}
