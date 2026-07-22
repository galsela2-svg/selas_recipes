"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Globe, Loader2 } from "lucide-react";
import type { ParsedRecipe } from "@/lib/types";
import { useCreateRecipe } from "@/lib/queries/recipes";
import { useToast } from "@/components/providers/toast-provider";
import { ImportableRecipeCard } from "@/components/search/importable-recipe-card";
import { Button } from "@/components/ui/button";

type WebSearchResult = { title: string; url: string; snippet: string };
type SearchResponse = { recipes: ParsedRecipe[]; links: WebSearchResult[] };

/**
 * Shown when the dashboard's own filters/search come up empty. Offers to
 * search the web for a recipe matching the same criteria (translated into a
 * text query) and lets you import one straight in — so "no matches" never
 * dead-ends the couple looking for something to cook.
 */
export function WebRecipeSuggestions({ query }: { query: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const createRecipe = useCreateRecipe();
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [importingUrl, setImportingUrl] = useState<string | null>(null);
  const [savingUrl, setSavingUrl] = useState<string | null>(null);

  async function handleSearch() {
    setSearched(true);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/search-recipes?q=${encodeURIComponent(query)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "החיפוש נכשל.");
      setResult(body as SearchResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setLoading(false);
    }
  }

  // "Import" saves the recipe straight to the collection and lands you on
  // it, with a toast confirming it was added — no separate review step.
  function saveRecipe(recipe: ParsedRecipe) {
    setSavingUrl(recipe.source_url);
    createRecipe.mutate(
      {
        title: recipe.title,
        description: recipe.description,
        image_url: recipe.image_url,
        source_url: recipe.source_url,
        prep_time_minutes: recipe.prep_time_minutes,
        cook_time_minutes: recipe.cook_time_minutes,
        servings: recipe.servings,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        tags: [],
        dietary_tags: [],
      },
      {
        onSuccess: (saved) => {
          showToast(`"${saved.title}" נוסף למתכונים שלכם!`);
          router.push(`/recipes/${saved.id}`);
        },
        onError: () => setError("לא הצלחנו לשמור את המתכון. נסו שוב."),
        onSettled: () => setSavingUrl(null),
      },
    );
  }

  async function importFromLink(link: WebSearchResult) {
    setImportingUrl(link.url);
    setError(null);
    try {
      const res = await fetch("/api/parse-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link.url }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "לא הצלחנו לפענח את הדף הזה.");
      saveRecipe(body as ParsedRecipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setImportingUrl(null);
    }
  }

  if (!searched) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-accent/40 bg-accent/5 p-5 text-center">
        <Globe className="size-6 text-accent" />
        <div>
          <p className="text-sm font-medium text-foreground">
            אין מתכון כזה באוסף שלכם עדיין
          </p>
          <p className="text-xs text-muted">אפשר לחפש באינטרנט מתכון שמתאים לדרישות שבחרתם</p>
        </div>
        <Button onClick={handleSearch}>
          <Globe className="size-4" />
          חפשו באינטרנט
        </Button>
      </div>
    );
  }

  const totalResults = (result?.recipes.length ?? 0) + (result?.links.length ?? 0);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
      {loading && (
        <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted">
          <Loader2 className="size-6 animate-spin" />
          מחפשים ברשת מתכון שמתאים...
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {!loading && result && totalResults === 0 && (
        <p className="py-4 text-center text-sm text-muted">
          גם באינטרנט לא מצאנו משהו שמתאים בול. נסו לשנות את הסינון או לחפש נושא אחר למעלה.
        </p>
      )}

      {result && result.recipes.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            מצאנו באינטרנט — לחצו לייבוא
          </p>
          <div className="flex flex-col gap-3">
            {result.recipes.map((recipe) => (
              <ImportableRecipeCard
                key={recipe.source_url}
                recipe={recipe}
                onImport={saveRecipe}
                saving={savingUrl === recipe.source_url}
              />
            ))}
          </div>
        </div>
      )}

      {result && result.links.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">עוד תוצאות</p>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
            {result.links.map((link) => (
              <li key={link.url} className="flex items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">{link.title}</p>
                  {link.snippet && (
                    <p className="line-clamp-1 text-xs text-muted">{link.snippet}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={importingUrl === link.url}
                  onClick={() => importFromLink(link)}
                >
                  ייבוא
                </Button>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground"
                >
                  <ExternalLink className="size-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
