"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useRecipe, useUpdateRecipe } from "@/lib/queries/recipes";
import { useToast } from "@/components/providers/toast-provider";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { Spinner } from "@/components/ui/spinner";
import type { RecipeInput } from "@/lib/types";

export default function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const { data: recipe, isLoading } = useRecipe(id);
  const { mutate, isPending } = useUpdateRecipe();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(input: RecipeInput) {
    setError(null);
    mutate(
      { id, input },
      {
        onSuccess: () => {
          showToast("השינויים נשמרו בהצלחה!");
          router.push("/dashboard");
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "לא הצלחנו לשמור את השינויים. נסו שוב.");
        },
      },
    );
  }

  if (isLoading || !recipe) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <RecipeForm
        initialRecipe={recipe}
        onSubmit={handleSubmit}
        submitLabel="שמירת שינויים"
        submitting={isPending}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
