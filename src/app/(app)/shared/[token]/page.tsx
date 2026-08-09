"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Clock, ImageOff, Users as UsersIcon } from "lucide-react";
import { useImportSharedRecipe, useSharedRecipe } from "@/lib/queries/recipe-shares";
import { describeError, formatMinutes } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/providers/toast-provider";

export default function SharedRecipePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const { data: recipe, isLoading, isError } = useSharedRecipe(token);
  const importRecipe = useImportSharedRecipe();

  async function handleImport() {
    try {
      const imported = await importRecipe.mutateAsync(token);
      showToast("המתכון נוסף לאוסף שלכם!");
      router.replace(`/recipes/${imported.id}`);
    } catch (err) {
      showToast(describeError(err, "לא הצלחנו להוסיף את המתכון."), "error");
    }
  }

  if (isLoading) return <Spinner />;

  if (isError || !recipe) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <h1 className="text-lg font-semibold text-foreground">הקישור לא תקין</h1>
        <p className="mt-2 text-sm text-muted">קישור השיתוף פג תוקף או שאינו קיים יותר.</p>
      </div>
    );
  }

  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {recipe.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="h-56 w-full object-cover"
          />
        ) : (
          <div className="flex h-40 items-center justify-center bg-surface-2 text-muted">
            <ImageOff className="size-8" strokeWidth={1.5} />
          </div>
        )}
        <div className="space-y-3 p-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{recipe.title}</h1>
            {recipe.description && (
              <p className="mt-1 text-sm text-muted">{recipe.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted">
            {totalTime > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="size-4" /> {formatMinutes(totalTime)}
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <UsersIcon className="size-4" /> {recipe.servings} מנות
              </span>
            )}
          </div>

          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold text-foreground">מצרכים</h2>
        <ul className="space-y-1.5 rounded-xl border border-border bg-surface p-4 text-sm text-foreground">
          {recipe.ingredients.map((ingredient, i) => (
            <li key={i}>{ingredient}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-foreground">הוראות הכנה</h2>
        <ol className="space-y-3 rounded-xl border border-border bg-surface p-4 text-sm text-foreground">
          {recipe.instructions.map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <Button
        size="lg"
        className="w-full"
        loading={importRecipe.isPending}
        onClick={handleImport}
      >
        <ChefHat className="size-4" />
        הוספה לאוסף שלי
      </Button>
    </div>
  );
}
