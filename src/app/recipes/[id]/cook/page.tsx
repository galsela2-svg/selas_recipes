"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Dices,
  Frown,
  Layers,
  ListChecks,
  Loader2,
  Meh,
  PartyPopper,
  Smile,
  SmilePlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRecipe } from "@/lib/queries/recipes";
import { useAddRecipePhoto } from "@/lib/queries/recipe-photos";
import { useAddCookLog } from "@/lib/queries/cook-logs";
import { Spinner } from "@/components/ui/spinner";
import { Confetti } from "@/components/ui/confetti";
import { InstructionText } from "@/components/recipes/instruction-text";
import { useSettings } from "@/components/providers/settings-provider";
import { useWakeLock } from "@/lib/use-wake-lock";
import { todayIsoDate } from "@/lib/date-utils";
import { isParallelStep } from "@/lib/parallel-step";
import { cn } from "@/lib/utils";

const EMOJI_RATINGS: { icon: LucideIcon; label: string; rating: number }[] = [
  { icon: Frown, label: "לא כל כך", rating: 2 },
  { icon: Meh, label: "בסדר", rating: 5 },
  { icon: Smile, label: "טוב", rating: 7 },
  { icon: SmilePlus, label: "טעים!", rating: 9 },
  { icon: PartyPopper, label: "מושלם!", rating: 10 },
];

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
  const [loggedRating, setLoggedRating] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addPhoto = useAddRecipePhoto();
  const addLog = useAddCookLog();

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
  const nextStep = step < totalSteps - 1 ? recipe.instructions[step + 1] : null;
  const nextIsParallel = nextStep ? isParallelStep(nextStep) : false;

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    addPhoto.mutate({ recipeId: id, file });
  }

  function handleQuickRate(rating: number) {
    setLoggedRating(rating);
    addLog.mutate({ recipeId: id, cookedOn: todayIsoDate(), rating, notes: null });
  }

  if (completed) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 text-center">
        <Confetti />

        <div className="flex size-20 items-center justify-center rounded-full bg-accent/15 text-accent">
          <PartyPopper className="size-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">כל הכבוד, סיימתם לבשל!</h1>
          <p className="text-muted">איך יצא {recipe.title}?</p>
        </div>

        {loggedRating === null ? (
          <div className="flex gap-2">
            {EMOJI_RATINGS.map(({ icon: Icon, label, rating }) => (
              <button
                key={rating}
                onClick={() => handleQuickRate(rating)}
                title={label}
                className="flex size-14 items-center justify-center rounded-full border border-border bg-surface text-muted transition-transform cursor-pointer active:scale-90 hover:border-accent/50 hover:text-accent"
              >
                <Icon className="size-7" strokeWidth={1.75} />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-lg font-medium text-accent">הבישול נרשם ביומן שלכם!</p>
        )}

        <div className="flex w-full max-w-xs flex-col gap-2 pt-4">
          <Link
            href={`/recipes/${id}`}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-accent px-6 text-base font-medium text-accent-foreground transition-colors hover:opacity-90"
          >
            חזרה למתכון
          </Link>
          <Link
            href="/roulette"
            className="flex h-12 items-center justify-center gap-2 rounded-lg border border-border px-6 text-base font-medium text-foreground transition-colors hover:bg-surface-2"
          >
            <Dices className="size-4.5" />
            סבבו את הגלגל למתכון הבא
          </Link>
        </div>
      </div>
    );
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
                    <InstructionText text={nextStep} />
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
