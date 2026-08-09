"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  ListChecks,
  PartyPopper,
  X,
} from "lucide-react";
import { useRecipe } from "@/lib/queries/recipes";
import { Spinner } from "@/components/ui/spinner";
import { Confetti } from "@/components/ui/confetti";
import { InstructionText } from "@/components/recipes/instruction-text";
import { useSettings } from "@/components/providers/settings-provider";
import { useWakeLock } from "@/lib/use-wake-lock";
import { isParallelStep } from "@/lib/parallel-step";
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
  const [completed, setCompleted] = useState(false);

  useWakeLock(settings.keepScreenAwake);

  if (isLoading || !recipe) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  const totalSteps = recipe.instructions.length;
  const currentStep = recipe.instructions[step] ?? "";
  const nextStep = step < totalSteps - 1 ? recipe.instructions[step + 1] : null;
  const nextIsParallel = nextStep ? isParallelStep(nextStep) : false;

  if (completed) {
    return (
      <div className="relative flex h-dvh flex-col items-center justify-center gap-8 overflow-y-auto bg-background px-6 text-center">
        <Confetti />

        <div className="flex size-20 items-center justify-center rounded-full bg-accent/15 text-accent">
          <PartyPopper className="size-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">כל הכבוד, סיימתם לבשל!</h1>
          <p className="text-muted">בתיאבון עם {recipe.title}!</p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-2 pt-4">
          <Link
            href={`/recipes/${id}`}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-accent px-6 text-base font-medium text-accent-foreground transition-colors hover:opacity-90"
          >
            חזרה למתכון
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-8">
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
          {recipe.source_url && (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              title="קישור למקור"
              className="flex items-center gap-2 text-sm text-muted hover:text-foreground"
            >
              <ExternalLink className="size-5" />
            </a>
          )}
          <button
            onClick={() => setShowIngredients((v) => !v)}
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground cursor-pointer"
          >
            <ListChecks className="size-5" />
            <span className="hidden sm:inline">מרכיבים</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-6 py-4 sm:gap-10 sm:px-16 sm:py-10">
          {totalSteps > 0 ? (
            <>
              <p className="text-sm font-medium uppercase tracking-widest text-accent">
                שלב {step + 1} מתוך {totalSteps}
              </p>

              <p className="max-w-3xl text-center text-2xl font-medium leading-snug text-foreground sm:text-4xl sm:leading-relaxed">
                <InstructionText text={currentStep} ingredients={recipe.ingredients} />
              </p>

              {nextStep && (
                <div
                  className={cn(
                    "max-w-xl rounded-xl px-4 py-2.5 text-center",
                    nextIsParallel
                      ? "border border-accent/40 bg-accent/10"
                      : "border border-border bg-surface",
                  )}
                >
                  <p
                    className={cn(
                      "mb-0.5 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wide",
                      nextIsParallel ? "text-accent" : "text-muted",
                    )}
                  >
                    {nextIsParallel && <Layers className="size-3.5" />}
                    {nextIsParallel ? "לעשות במקביל" : "השלב הבא"}
                  </p>
                  <p className={cn("text-sm", nextIsParallel ? "text-foreground" : "text-muted")}>
                    <InstructionText text={nextStep} ingredients={recipe.ingredients} />
                  </p>
                </div>
              )}

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

                {step === totalSteps - 1 ? (
                  <button
                    onClick={() => setCompleted(true)}
                    className="flex size-14 items-center justify-center rounded-full bg-success text-accent-foreground transition-opacity hover:opacity-90 cursor-pointer"
                  >
                    <PartyPopper className="size-6" />
                  </button>
                ) : (
                  <button
                    onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
                    className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground transition-opacity hover:opacity-90 cursor-pointer"
                  >
                    <ChevronLeft className="size-6" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <p className="text-lg text-muted">
                למתכון הזה עדיין אין שלבי הכנה.
              </p>
              <button
                onClick={() => setCompleted(true)}
                className="flex h-12 items-center justify-center gap-2 rounded-lg bg-success px-6 text-base font-medium text-accent-foreground transition-opacity hover:opacity-90 cursor-pointer"
              >
                <PartyPopper className="size-4.5" />
                סיימתי לבשל
              </button>
            </div>
          )}
        </main>

        {showIngredients && (
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-s border-border bg-surface p-6 sm:block">
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

      {/* On mobile this is a bottom-sheet overlay (fixed, capped height, own
          scroll) instead of stacking inline below main — inline would push
          the whole page taller than the viewport and force page-level
          scrolling, which cooking mode is meant to avoid entirely. */}
      {showIngredients && (
        <>
          <div
            onClick={() => setShowIngredients(false)}
            className="fixed inset-0 z-20 bg-black/40 sm:hidden"
          />
          <div className="fixed inset-x-0 bottom-0 z-30 max-h-[70dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:hidden">
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
        </>
      )}
    </div>
  );
}
