"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useRecipe, useUpdateRecipe } from "@/lib/queries/recipes";
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
  const { data: recipe, isLoading } = useRecipe(id);
  const { mutate, isPending } = useUpdateRecipe();

  function handleSubmit(input: RecipeInput) {
    mutate(
      { id, input },
      {
        onSuccess: () => {
          router.push(`/recipes/${id}`);
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
    </div>
  );
}
