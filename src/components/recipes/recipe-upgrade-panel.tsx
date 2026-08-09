"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { DIETARY_TAG_OPTIONS, type Recipe, type RecipeInput } from "@/lib/types";
import { useUpdateRecipe } from "@/lib/queries/recipes";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLE_PRESETS = ["בריא יותר", "ללא גלוטן", "טבעוני", "צמחוני", "דל פחמימות", "ללא מוצרי חלב"];

type UpgradeResult = {
  title: string;
  description: string | null;
  ingredients: string[];
  instructions: string[];
  dietary_tags_add: string[];
  summary: string;
};

/** Lets the user pick a style (a preset like "ללא גלוטן"/"צמחוני", or their
 * own free text) and has AI rewrite the recipe's ingredients + instructions
 * to fit it — a real rewrite, not just tips. The result is a preview the
 * user can apply (saved as an update to this same recipe) or discard. */
export function RecipeUpgradePanel({ recipe }: { recipe: Recipe }) {
  const updateRecipe = useUpdateRecipe();
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UpgradeResult | null>(null);

  function reset() {
    setStyle("");
    setLoading(false);
    setError(null);
    setResult(null);
  }

  async function handleGenerate(chosenStyle: string) {
    const trimmed = chosenStyle.trim();
    if (!trimmed) return;

    setStyle(trimmed);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/upgrade-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe: {
            title: recipe.title,
            description: recipe.description,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
          },
          style: trimmed,
          dietaryTagOptions: DIETARY_TAG_OPTIONS,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "משהו השתבש.");
      setResult(body as UpgradeResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!result) return;
    const input: RecipeInput = {
      title: result.title,
      description: result.description,
      image_url: recipe.image_url,
      source_url: recipe.source_url,
      prep_time_minutes: recipe.prep_time_minutes,
      cook_time_minutes: recipe.cook_time_minutes,
      servings: recipe.servings,
      ingredients: result.ingredients,
      instructions: result.instructions,
      tags: recipe.tags,
      dietary_tags: Array.from(new Set([...recipe.dietary_tags, ...result.dietary_tags_add])),
      made_by_user_id: recipe.made_by_user_id,
    };
    updateRecipe.mutate(
      { id: recipe.id, input },
      {
        onSuccess: () => {
          setOpen(false);
          reset();
        },
      },
    );
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <Sparkles className="size-4" />
        שיפור מתכון
      </Button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="שיפור המתכון עם AI"
      >
        {!result && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              בחרו סגנון, או כתבו אחד משלכם — ה-AI ישכתב מחדש את המרכיבים וההוראות בהתאם.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_PRESETS.map((preset) => (
                <Badge key={preset} active={style === preset} onClick={() => handleGenerate(preset)}>
                  {preset}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="או סגנון משלכם — למשל 'מתאים לילדים'"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleGenerate(style);
                  }
                }}
              />
              <Button onClick={() => handleGenerate(style)} disabled={!style.trim() || loading} loading={loading}>
                יצירה
              </Button>
            </div>
            {loading && (
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <Loader2 className="size-3.5 animate-spin" />
                משכתב את המתכון...
              </p>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="rounded-lg bg-surface-2 p-3 text-sm">
              <p className="font-medium text-foreground">{result.title}</p>
              <p className="mt-1 text-muted">{result.summary}</p>
            </div>

            <div className={cn("max-h-[45vh] space-y-4 overflow-y-auto")}>
              <div>
                <h3 className="mb-1.5 text-sm font-semibold text-foreground">מרכיבים</h3>
                <ul className="space-y-1 text-sm text-foreground">
                  {result.ingredients.map((ing, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-1.5 text-sm font-semibold text-foreground">הוראות הכנה</h3>
                <ol className="space-y-1.5 text-sm text-foreground">
                  {result.instructions.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="shrink-0 text-muted">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={reset}>
                ניסיון סגנון אחר
              </Button>
              <Button onClick={handleApply} loading={updateRecipe.isPending}>
                החלה על המתכון
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
