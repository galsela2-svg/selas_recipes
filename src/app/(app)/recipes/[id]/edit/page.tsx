"use client";

import { use } from "react";
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

  function handleSubmit(input: RecipeInput) {
    mutate(
      { id, input },
      {
        onSuccess: () => {
          showToast("השינויים נשמרו בהצלחה!");
          router.push("/dashboard");
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
