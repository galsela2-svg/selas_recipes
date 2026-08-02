"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateRecipe } from "@/lib/queries/recipes";
import { useToast } from "@/components/providers/toast-provider";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { describeError } from "@/lib/utils";
import type { RecipeInput } from "@/lib/types";

export default function NewRecipePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { mutate, isPending } = useCreateRecipe();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(input: RecipeInput) {
    setError(null);
    mutate(input, {
      onSuccess: (recipe) => {
        showToast(`"${recipe.title}" נשמר בהצלחה!`);
        router.push(`/dashboard?highlight=${recipe.id}`);
      },
      onError: (err) => {
        setError(describeError(err, "לא הצלחנו לשמור את המתכון. נסו שוב."));
      },
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <RecipeForm
        onSubmit={handleSubmit}
        submitLabel="שמירת מתכון"
        submitting={isPending}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
