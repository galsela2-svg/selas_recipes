"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChefHat, ChevronRight, Settings } from "lucide-react";
import { useRecipe } from "@/lib/queries/recipes";

const STATIC_TITLES: Record<string, string> = {
  "/dashboard": "מתכונים",
  "/recipes/new": "מתכון חדש",
  "/shopping-list": "רשימת קניות",
  "/pantry": "המזווה שלי",
  "/settings": "הגדרות",
  "/achievements": "הישגים",
  "/roulette": "גלגל המתכונים",
  "/export": "ייצוא לספר מתכונים",
};

// The three bottom-tab destinations — everything else is a page you
// navigated *into*, so it gets a back button instead of the brand icon.
const ROOT_PATHS = new Set(["/dashboard", "/recipes/new", "/shopping-list"]);

/** Mirrors whatever page you're on, instead of a fixed app name — matches
 * that page's own <h1> so the header never says something different from
 * the content below it. */
function usePageTitle(pathname: string): string {
  const editMatch = pathname.match(/^\/recipes\/[^/]+\/edit$/);
  const viewMatch = pathname.match(/^\/recipes\/([^/]+)$/);
  const recipeId = viewMatch && viewMatch[1] !== "new" ? viewMatch[1] : undefined;
  const { data: recipe } = useRecipe(recipeId ?? "");

  if (editMatch) return "עריכת מתכון";
  if (recipeId) return recipe?.title ?? "מתכון";
  return STATIC_TITLES[pathname] ?? "מתכונים";
}

export function TopHeader({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const title = usePageTitle(pathname);
  const isRoot = ROOT_PATHS.has(pathname);

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        height: "calc(3.5rem + env(safe-area-inset-top))",
      }}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {isRoot ? (
          <ChefHat className="size-4.5 shrink-0 text-accent" strokeWidth={1.75} />
        ) : (
          <button
            onClick={() => router.back()}
            title="חזרה"
            className="flex size-8 shrink-0 -ms-1.5 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground cursor-pointer"
          >
            <ChevronRight className="size-5" />
          </button>
        )}
        <span className="truncate font-serif text-lg font-bold text-foreground">{title}</span>
      </div>

      <Link
        href="/settings"
        title={userEmail ?? "הגדרות"}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <Settings className="size-4.5" />
      </Link>
    </header>
  );
}
