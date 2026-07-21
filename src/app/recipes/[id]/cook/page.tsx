"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Loader2,
  X,
} from "lucide-react";
import { useRecipe } from "@/lib/queries/recipes";
import { useAddRecipePhoto } from "@/lib/queries/recipe-photos";
import { Spinner } from "@/components/ui/spinner";
import { InstructionText } from "@/components/recipes/instruction-text";
import { useSettings } from "@/components/providers/settings-provider";
import { useWakeLock } from "@/lib/use-wake-lock";
import { cn } from "@/lib/utils";

export default function CookingModePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: recipe, isLoading } = useRecipe(id);
  const [settings] = useSettings();
  const [step, setStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addPhoto = useAddRecipePhoto();

  useWakeLock(settings.keepScreenAwake);

  if (isLoading || !recipe) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  const totalSteps = recipe.instructions.length;
  const currentStep = recipe.instructions[step] ?? "";

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    addPhoto.mutate({ recipeId: id, file });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-8">
        <Link
          href={`/recipes/${id}`}
          className="flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <X className="size-5" />
          יציאה
        </Link>
        <h1 className="min-w-0 flex-1 truncate px-4 text-center text-sm font-medium text-muted sm:text-base">
          {recipe.title}
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={addPhoto.isPending}
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground cursor-pointer disabled:opacity-50"
          >
            {addPhoto.isPending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Camera className="size-5" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <button
            onClick={() => setShowIngredients((v) => !v)}
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground cursor-pointer"
          >
            <ListChecks className="size-5" />
            <span className="hidden sm:inline">מרכיבים</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-10 sm:px-16">
          {totalSteps > 0 ? (
            <>
              <p className="text-sm font-medium uppercase tracking-widest text-accent">
                שלב {step + 1} מתוך {totalSteps}
              </p>

              <p className="max-w-3xl text-center text-3xl font-medium leading-relaxed text-foreground sm:text-4xl">
                <InstructionText text={currentStep} />
              </p>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="flex size-14 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-surface-2 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="size-6" />
                </button>

                <div className="flex gap-1.5">
                  {recipe.instructions.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "size-1.5 rounded-full",
                        i === step ? "bg-accent" : "bg-surface-2",
                      )}
                    />
                  ))}
                </div>

                <button
                  onClick={() =>
                    setStep((s) => Math.min(totalSteps - 1, s + 1))
                  }
                  disabled={step === totalSteps - 1}
                  className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="size-6" />
                </button>
              </div>
            </>
          ) : (
            <p className="text-lg text-muted">
              למתכון הזה עדיין אין שלבי הכנה.
            </p>
          )}
        </main>

        {showIngredients && (
          <aside className="hidden w-80 shrink-0 border-s border-border bg-surface p-6 sm:block">
            <h2 className="mb-4 font-semibold text-foreground">מרכיבים</h2>
            <ul className="space-y-3">
              {recipe.ingredients.map((ingredient, i) => (
                <li key={i} className="flex gap-2 text-base text-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  {ingredient}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      {showIngredients && (
        <div className="border-t border-border bg-surface p-6 sm:hidden">
          <h2 className="mb-4 font-semibold text-foreground">מרכיבים</h2>
          <ul className="space-y-3">
            {recipe.ingredients.map((ingredient, i) => (
              <li key={i} className="flex gap-2 text-base text-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                {ingredient}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
