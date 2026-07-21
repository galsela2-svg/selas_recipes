"use client";

import { useState } from "react";
import { Lightbulb, Repeat, Sparkles } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type AiUpgradeResult = {
  variations: { title: string; description: string }[];
  substitutions: { original: string; substitute: string; reason: string }[];
  enhancements: string[];
};

export function AiUpgradePanel({ recipe }: { recipe: Recipe }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiUpgradeResult | null>(null);

  async function handleClick() {
    setOpen(true);
    if (result || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe: {
            title: recipe.title,
            description: recipe.description,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            tags: recipe.tags,
          },
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "משהו השתבש.");
      setResult(body as AiUpgradeResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={handleClick}>
        <Sparkles className="size-4" />
        שדרוג עם AI
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="שדרוג המתכון עם AI">
        {loading && (
          <p className="py-8 text-center text-sm text-muted">חושב על רעיונות...</p>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        {result && (
          <div className="max-h-[60vh] space-y-5 overflow-y-auto">
            {result.variations.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Sparkles className="size-4 text-accent" />
                  גרסאות יצירתיות
                </h3>
                <ul className="space-y-2">
                  {result.variations.map((v, i) => (
                    <li key={i} className="rounded-lg bg-surface-2 p-3 text-sm">
                      <p className="font-medium text-foreground">{v.title}</p>
                      <p className="mt-0.5 text-muted">{v.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.substitutions.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Repeat className="size-4 text-accent" />
                  תחליפים בריאים
                </h3>
                <ul className="space-y-2">
                  {result.substitutions.map((s, i) => (
                    <li key={i} className="rounded-lg bg-surface-2 p-3 text-sm">
                      <p className="font-medium text-foreground">
                        {s.original} ← {s.substitute}
                      </p>
                      <p className="mt-0.5 text-muted">{s.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.enhancements.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Lightbulb className="size-4 text-accent" />
                  טיפים לשיפור הטעם
                </h3>
                <ul className="space-y-1.5 text-sm text-muted">
                  {result.enhancements.map((tip, i) => (
                    <li key={i}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
