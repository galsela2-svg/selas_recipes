"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ExternalLink, Loader2, Search as SearchIcon } from "lucide-react";
import type { ParsedRecipe } from "@/lib/types";
import { PENDING_IMPORT_KEY } from "@/lib/pending-import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";

type WebSearchResult = { title: string; url: string; snippet: string };
type SearchResponse = { recipes: ParsedRecipe[]; links: WebSearchResult[] };

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [importingUrl, setImportingUrl] = useState<string | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/search-recipes?q=${encodeURIComponent(query.trim())}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "החיפוש נכשל.");
      setResult(body as SearchResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setLoading(false);
    }
  }

  function importRecipe(recipe: ParsedRecipe) {
    sessionStorage.setItem(PENDING_IMPORT_KEY, JSON.stringify(recipe));
    router.push("/recipes/new");
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

      {result && result.recipes.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            מתכונים מוכנים לייבוא
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {result.recipes.map((recipe) => (
              <button
                key={recipe.source_url}
                onClick={() => importRecipe(recipe)}
                className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface text-start transition-colors hover:border-accent/50 cursor-pointer"
              >
                <div className="aspect-video w-full overflow-hidden bg-surface-2">
                  {recipe.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={recipe.image_url}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <p className="line-clamp-2 text-sm font-medium text-foreground">
                    {recipe.title}
                  </p>
                  <p className="truncate text-xs text-muted" dir="ltr">
                    {new URL(recipe.source_url).hostname.replace(/^www\./, "")}
                  </p>
                </div>
              </button>
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
