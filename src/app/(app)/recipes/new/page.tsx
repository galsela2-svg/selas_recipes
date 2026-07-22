"use client";

import { useRouter } from "next/navigation";
import { useCreateRecipe } from "@/lib/queries/recipes";
import { useToast } from "@/components/providers/toast-provider";
import { RecipeForm } from "@/components/recipes/recipe-form";
import type { RecipeInput } from "@/lib/types";

export default function NewRecipePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { mutate, isPending } = useCreateRecipe();

  function handleSubmit(input: RecipeInput) {
    mutate(input, {
      onSuccess: (recipe) => {
        showToast(`"${recipe.title}" נשמר בהצלחה! 🎉`);
        router.push(`/recipes/${recipe.id}`);
      },
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">מתכון חדש</h1>
        <p className="text-sm text-muted">
          הוסיפו אותו ידנית או פענחו מקישור.
        </p>
      </div>

      <RecipeForm
        onSubmit={handleSubmit}
        submitLabel="שמירת מתכון"
        submitting={isPending}
      />
    </div>
  );
}
