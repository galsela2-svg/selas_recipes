"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Dices, ExternalLink, Loader2, Search as SearchIcon } from "lucide-react";
import type { ParsedRecipe } from "@/lib/types";
import { PENDING_IMPORT_KEY } from "@/lib/pending-import";
import { useCreateRecipe, useRecipes } from "@/lib/queries/recipes";
import { buildDiscoveryQuery } from "@/lib/taste-profile";
import { useToast } from "@/components/providers/toast-provider";
import { ImportableRecipeCard } from "@/components/search/importable-recipe-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";

type WebSearchResult = { title: string; url: string; snippet: string };
type SearchResponse = { recipes: ParsedRecipe[]; links: WebSearchResult[] };

type Token = { emoji: string; label: string };

const TOKEN_GROUPS: { label: string; tokens: Token[] }[] = [
  {
    label: "סוג מנה",
    tokens: [
      { emoji: "🍰", label: "עוגות" },
      { emoji: "🍝", label: "פסטה" },
      { emoji: "🍲", label: "מרקים" },
      { emoji: "🥗", label: "סלטים" },
      { emoji: "🍗", label: "עוף" },
      { emoji: "🍨", label: "קינוחים" },
      { emoji: "🥦", label: "צמחוני" },
      { emoji: "⚡", label: "מהיר וקל" },
    ],
  },
  {
    // Food-based icons only — a cuisine is represented by a dish, not by a
    // caricature of a person in ethnic/religious dress.
    label: "סגנון אוכל",
    tokens: [
      { emoji: "🍕", label: "איטלקי" },
      { emoji: "🥢", label: "אסייתי" },
      { emoji: "🍔", label: "אמריקאי" },
      { emoji: "🌮", label: "מקסיקני" },
      { emoji: "🍛", label: "הודי" },
      { emoji: "🍜", label: "תאילנדי" },
      { emoji: "🥙", label: "יווני" },
      { emoji: "🫓", label: "מרוקאי" },
      { emoji: "🥐", label: "צרפתי" },
      { emoji: "🧆", label: "מזרח תיכוני" },
    ],
  },
  {
    label: "זמן הכנה",
    tokens: [
      { emoji: "⏱️", label: "מהיר" },
      { emoji: "🕐", label: "תוך שעה" },
      { emoji: "⏳", label: "בישול איטי" },
    ],
  },
  {
    label: "רמת קושי",
    tokens: [
      { emoji: "😌", label: "קל להכנה" },
      { emoji: "🤔", label: "רמת קושי בינונית" },
      { emoji: "💪", label: "מתכון מאתגר" },
    ],
  },
  {
    label: "כשרות",
    tokens: [
      { emoji: "🥩", label: "בשרי" },
      { emoji: "🧀", label: "חלבי" },
      { emoji: "🥬", label: "פרווה" },
    ],
  },
  {
    label: "סוג ארוחה",
    tokens: [
      { emoji: "🍳", label: "ארוחת בוקר" },
      { emoji: "🥙", label: "ארוחת צהריים" },
      { emoji: "🍽️", label: "ארוחת ערב" },
      { emoji: "🍰", label: "קינוח" },
    ],
  },
];

export default function SearchPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: myRecipes, isLoading: myRecipesLoading } = useRecipes();
  const createRecipe = useCreateRecipe();
  const [quickSavingUrl, setQuickSavingUrl] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [importingUrl, setImportingUrl] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<SearchResponse | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const hasFetchedSuggestions = useRef(false);

  // Auto-loads once, the moment the user's own collection has finished
  // loading (so the query can be biased toward what they actually cook).
  // Regenerating afterward goes through the "הפתיעו אותי" button instead.
  useEffect(() => {
    if (myRecipesLoading || hasFetchedSuggestions.current) return;
    hasFetchedSuggestions.current = true;

    let cancelled = false;
    setSuggestionsLoading(true);
    setSuggestionsError(null);

    const q = buildDiscoveryQuery(myRecipes);
    fetch(`/api/search-recipes?q=${encodeURIComponent(q)}`)
      .then(async (res) => ({ ok: res.ok, body: await res.json() }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) throw new Error(body.error || "לא הצלחנו למצוא הצעות.");
        setSuggestions(body as SearchResponse);
      })
      .catch((err) => {
        if (!cancelled) {
          setSuggestionsError(err instanceof Error ? err.message : "משהו השתבש.");
        }
      })
      .finally(() => {
        if (!cancelled) setSuggestionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [myRecipesLoading, myRecipes]);

  async function refreshSuggestions() {
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const q = buildDiscoveryQuery(myRecipes);
      const res = await fetch(`/api/search-recipes?q=${encodeURIComponent(q)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "לא הצלחנו למצוא הצעות.");
      setSuggestions(body as SearchResponse);
    } catch (err) {
      setSuggestionsError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setSuggestionsLoading(false);
    }
  }

  async function performSearch(term: string) {
    if (!term.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/search-recipes?q=${encodeURIComponent(term.trim())}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "החיפוש נכשל.");
      setResult(body as SearchResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    performSearch(query);
  }

  function toggleToken(token: string) {
    setQuery((prev) => {
      const words = prev.split(/\s+/).filter(Boolean);
      const tokenWords = token.split(/\s+/);
      const has = tokenWords.every((w) => words.includes(w));
      if (has) {
        return words.filter((w) => !tokenWords.includes(w)).join(" ");
      }
      return [...words, ...tokenWords].join(" ");
    });
  }

  function isTokenActive(token: string): boolean {
    const words = query.split(/\s+/).filter(Boolean);
    return token.split(/\s+/).every((w) => words.includes(w));
  }

  function importRecipe(recipe: ParsedRecipe) {
    sessionStorage.setItem(PENDING_IMPORT_KEY, JSON.stringify(recipe));
    router.push("/recipes/new");
  }

  function quickSaveRecipe(recipe: ParsedRecipe) {
    setQuickSavingUrl(recipe.source_url);
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
        onSuccess: () => showToast(`"${recipe.title}" נשמר למתכונים שלכם! 🎉`),
        onError: () => setError("לא הצלחנו לשמור את המתכון. נסו שוב."),
        onSettled: () => setQuickSavingUrl(null),
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
      importRecipe(body as ParsedRecipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setImportingUrl(null);
    }
  }

  const hasSearched = result !== null;
  const totalResults = (result?.recipes.length ?? 0) + (result?.links.length ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">חיפוש מתכונים</h1>
        <p className="text-sm text-muted">חפשו נושא, ואנחנו נמצא מתכונים באינטרנט.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="לדוגמה: עוגת שוקולד, פסטה ברוטב שמנת..."
          className="flex-1"
        />
        <Button type="submit" loading={loading}>
          <SearchIcon className="size-4" />
        </Button>
      </form>

      <div className="space-y-3">
        {TOKEN_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <p className="text-xs font-medium text-muted">{group.label}</p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
              {group.tokens.map(({ emoji, label }) => (
                <button
                  key={label}
                  onClick={() => toggleToken(label)}
                  className={
                    "flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors cursor-pointer " +
                    (isTokenActive(label)
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-surface text-muted hover:border-accent/50 hover:text-foreground")
                  }
                >
                  <span className="text-lg leading-none">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading && (
        <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted">
          <Loader2 className="size-6 animate-spin" />
          מחפשים ובודקים מתכונים ברשת...
        </div>
      )}

      {hasSearched && !loading && totalResults === 0 && (
        <EmptyState
          icon={SearchIcon}
          title="לא נמצאו תוצאות"
          description="נסו נושא אחר או ניסוח שונה."
        />
      )}

      {!hasSearched && !loading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-serif text-lg font-bold text-foreground">אולי תאהבו 🎲</p>
            <button
              onClick={refreshSuggestions}
              disabled={suggestionsLoading}
              className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground cursor-pointer disabled:opacity-50"
            >
              <Dices className="size-3.5" />
              הפתיעו אותי שוב
            </button>
          </div>
          <p className="text-xs text-muted">
            הצעות מהאינטרנט לפי מה שאתם בדרך כלל מבשלים — עד שתחפשו משהו ספציפי.
          </p>

          {suggestionsLoading && (
            <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted">
              <Loader2 className="size-5 animate-spin" />
              מחפשים הצעות בשבילכם...
            </div>
          )}

          {suggestionsError && <p className="text-sm text-danger">{suggestionsError}</p>}

          {!suggestionsLoading && suggestions && suggestions.recipes.length > 0 && (
            <div className="flex flex-col gap-3">
              {suggestions.recipes.map((recipe) => (
                <ImportableRecipeCard
                  key={recipe.source_url}
                  recipe={recipe}
                  onImport={importRecipe}
                  onQuickSave={quickSaveRecipe}
                  saving={quickSavingUrl === recipe.source_url}
                />
              ))}
            </div>
          )}

          {!suggestionsLoading &&
            suggestions &&
            suggestions.recipes.length === 0 &&
            suggestions.links.length === 0 && (
              <p className="py-4 text-center text-sm text-muted">
                לא הצלחנו למצוא הצעה הפעם — נסו &quot;הפתיעו אותי שוב&quot; או חפשו נושא ספציפי.
              </p>
            )}
        </div>
      )}

      {result && result.recipes.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            מתכונים מוכנים לייבוא
          </p>
          <div className="flex flex-col gap-3">
            {result.recipes.map((recipe) => (
              <ImportableRecipeCard
                key={recipe.source_url}
                recipe={recipe}
                onImport={importRecipe}
                onQuickSave={quickSaveRecipe}
                saving={quickSavingUrl === recipe.source_url}
              />
            ))}
          </div>
        </div>
      )}

      {result && result.links.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            תוצאות נוספות
          </p>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {result.links.map((link) => (
              <li key={link.url} className="flex items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">
                    {link.title}
                  </p>
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
