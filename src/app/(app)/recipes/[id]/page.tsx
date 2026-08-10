"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  ChefHat,
  Clock,
  ExternalLink,
  Heart,
  ImageOff,
  Pencil,
  Pin,
  Plus,
  ShoppingCart,
  Timer,
  Trash2,
  Users,
} from "lucide-react";
import {
  recipeKeys,
  useDeleteRecipe,
  useRecipe,
  useToggleFavorite,
  useTogglePinned,
  useUpdateRecipe,
} from "@/lib/queries/recipes";
import { getMemberColorPreset, useFamilyMembers } from "@/lib/queries/family";
import type { Recipe } from "@/lib/types";
import { useAddShoppingItems } from "@/lib/queries/shopping-list";
import { cn, formatMinutes } from "@/lib/utils";
import { scaleIngredientText } from "@/lib/quantity-scaling";
import { parseTimersInText } from "@/lib/timer-parser";
import {
  convertIngredientLine,
  convertTemperaturesInText,
  type UnitSystem,
} from "@/lib/unit-conversion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Modal } from "@/components/ui/modal";
import { ServingsAdjuster } from "@/components/recipes/servings-adjuster";
import { InstructionText } from "@/components/recipes/instruction-text";
import { ImageField } from "@/components/recipes/image-field";
import { RecipeUpgradePanel } from "@/components/recipes/recipe-upgrade-panel";
import { ShareRecipeButton } from "@/components/recipes/share-recipe-button";
import { useSettings } from "@/components/providers/settings-provider";

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: recipe, isLoading } = useRecipe(id);
  const { data: familyMembers } = useFamilyMembers();
  const madeByMember = familyMembers?.find((m) => m.user_id === recipe?.made_by_user_id);
  const madeByColor = getMemberColorPreset(madeByMember?.color)?.color;
  const deleteRecipe = useDeleteRecipe();
  const addShoppingItems = useAddShoppingItems();
  const toggleFavorite = useToggleFavorite();
  const togglePinned = useTogglePinned();
  const updateRecipe = useUpdateRecipe();
  const [settings] = useSettings();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [added, setAdded] = useState(false);
  const [targetServings, setTargetServings] = useState<number | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => settings.defaultUnitSystem);
  const [showImageModal, setShowImageModal] = useState(false);
  const [draftImageUrl, setDraftImageUrl] = useState("");

  const baseServings = recipe?.servings ?? 1;
  const servings = targetServings ?? baseServings;
  const multiplier = servings / baseServings;

  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];
    return recipe.ingredients.map((ingredient) => {
      const scaled = scaleIngredientText(ingredient, multiplier);
      const converted = convertIngredientLine(scaled, unitSystem);
      return { original: ingredient, text: converted };
    });
  }, [recipe, multiplier, unitSystem]);

  function buildInputWithImage(image_url: string | null) {
    if (!recipe) return null;
    return {
      title: recipe.title,
      description: recipe.description,
      image_url,
      source_url: recipe.source_url,
      prep_time_minutes: recipe.prep_time_minutes,
      cook_time_minutes: recipe.cook_time_minutes,
      servings: recipe.servings,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      tags: recipe.tags,
      dietary_tags: recipe.dietary_tags,
      made_by_user_id: recipe.made_by_user_id,
    };
  }

  // Best-effort, silent: a recipe with no cover image gets one searched for
  // and set automatically the first time its page is opened — covers both
  // freshly-created recipes and older ones that never had an image. Runs
  // once per recipe per page visit; a failed search just leaves it blank,
  // same as today, with no error shown (this shouldn't ever feel broken).
  const coverSearchAttempted = useRef<string | null>(null);
  useEffect(() => {
    if (!recipe || recipe.image_url || coverSearchAttempted.current === recipe.id) return;
    coverSearchAttempted.current = recipe.id;

    let cancelled = false;
    fetch("/api/find-cover-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: recipe.title }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancelled || !body?.image_url) return;
        // Re-check against the live cache, not the closed-over `recipe` —
        // the user may have set an image by hand while this search was
        // still in flight, and that manual choice should win.
        const current = queryClient.getQueryData<Recipe>(recipeKeys.detail(recipe.id));
        if (current && current.image_url) return;
        const input = buildInputWithImage(body.image_url as string);
        if (input) updateRecipe.mutate({ id: recipe.id, input });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.id, recipe?.image_url]);

  if (isLoading || !recipe) return <Spinner />;

  const totalTime =
    (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  function handleAddToShoppingList() {
    if (!recipe || scaledIngredients.length === 0) return;
    addShoppingItems.mutate(
      { names: scaledIngredients.map((i) => i.text), recipeId: recipe.id },
      { onSuccess: () => setAdded(true) },
    );
  }

  function handleDelete() {
    deleteRecipe.mutate(id, {
      onSuccess: () => router.push("/dashboard"),
    });
  }

  function openImageModal() {
    if (!recipe) return;
    setDraftImageUrl(recipe.image_url ?? "");
    setShowImageModal(true);
  }

  function handleSaveImage() {
    const input = buildInputWithImage(draftImageUrl.trim() || null);
    if (!recipe || !input) return;
    updateRecipe.mutate(
      { id: recipe.id, input },
      { onSuccess: () => setShowImageModal(false) },
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div
        role="button"
        tabIndex={0}
        onClick={openImageModal}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openImageModal();
          }
        }}
        className="group relative block aspect-[16/9] w-full overflow-hidden rounded-2xl bg-surface-2 shadow-sm cursor-pointer"
      >
        {recipe.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted">
            <ImageOff className="size-10" strokeWidth={1.5} />
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            <Camera className="size-3.5" />
            {recipe.image_url ? "החלפת תמונה" : "הוספת תמונה"}
          </span>
        </div>

        {madeByMember && (
          <span
            className="absolute start-3 top-3 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm"
            style={madeByColor ? { color: madeByColor } : undefined}
          >
            {madeByMember.display_name}
          </span>
        )}

        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite.mutate({ id: recipe.id, isFavorite: !recipe.is_favorite });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite.mutate({ id: recipe.id, isFavorite: !recipe.is_favorite });
            }
          }}
          className="absolute end-3 top-3 flex size-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm cursor-pointer transition-transform active:scale-90"
        >
          <Heart
            className={
              recipe.is_favorite ? "size-5 fill-danger text-danger" : "size-5 text-white"
            }
          />
        </div>

        <div
          role="button"
          tabIndex={0}
          title="נעיצה בראש הקטגוריה בעמוד הראשי"
          onClick={(e) => {
            e.stopPropagation();
            togglePinned.mutate({ id: recipe.id, isPinned: !recipe.is_pinned });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              togglePinned.mutate({ id: recipe.id, isPinned: !recipe.is_pinned });
            }
          }}
          className="absolute end-3 top-16 flex size-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm cursor-pointer transition-transform active:scale-90"
        >
          <Pin
            className={
              recipe.is_pinned ? "size-5 fill-accent text-accent" : "size-5 text-white"
            }
          />
        </div>
      </div>

      <Modal open={showImageModal} onClose={() => setShowImageModal(false)} title="תמונת המתכון">
        <div className="space-y-4">
          <ImageField
            value={draftImageUrl}
            onChange={setDraftImageUrl}
            defaultSearchQuery={recipe.title}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowImageModal(false)}>
              ביטול
            </Button>
            <Button onClick={handleSaveImage} loading={updateRecipe.isPending}>
              שמירה
            </Button>
          </div>
        </div>
      </Modal>

      <div className="space-y-3">
        {recipe.source_url && (
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 self-start text-sm text-muted hover:text-accent"
          >
            <ExternalLink className="size-3.5" />
            קישור למקור
          </a>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/recipes/${id}/cook`} className="flex-1 sm:flex-none">
            <Button size="lg" className="w-full sm:w-auto">
              <ChefHat className="size-5" />
              בישול
            </Button>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <ShareRecipeButton recipe={recipe} />
            <RecipeUpgradePanel recipe={recipe} />
            <Link href={`/recipes/${id}/edit`}>
              <Button variant="ghost" title="עריכה" aria-label="עריכה">
                <Pencil className="size-4" />
              </Button>
            </Link>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        {recipe.description && (
          <p className="text-sm text-muted">{recipe.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
          {totalTime > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" />
              {formatMinutes(totalTime)}
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1.5">
              <Users className="size-4" />
              {recipe.servings} מנות (מקורי)
            </span>
          )}
        </div>

        {(recipe.tags.length > 0 || recipe.dietary_tags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {recipe.dietary_tags.map((tag) => (
              <Badge
                key={tag}
                className="!border-success/40 !bg-success/15 !text-success"
              >
                {tag}
              </Badge>
            ))}
            {recipe.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        )}

      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground">מרכיבים</h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAddToShoppingList}
                loading={addShoppingItems.isPending}
                disabled={scaledIngredients.length === 0}
                title={added ? "נוסף לרשימת הקניות" : "הוספה לרשימת קניות"}
                aria-label={added ? "נוסף לרשימת הקניות" : "הוספה לרשימת קניות"}
              >
                <Plus className="size-3.5" />
                <ShoppingCart className="size-3.5" />
              </Button>
            </div>
            <div className="flex overflow-hidden rounded-lg border border-border text-xs">
              <button
                onClick={() => setUnitSystem("imperial")}
                className={cn(
                  "px-2.5 py-1.5 cursor-pointer",
                  unitSystem === "imperial" ? "bg-accent text-accent-foreground" : "text-muted",
                )}
              >
                אימפריאלי
              </button>
              <button
                onClick={() => setUnitSystem("metric")}
                className={cn(
                  "px-2.5 py-1.5 cursor-pointer",
                  unitSystem === "metric" ? "bg-accent text-accent-foreground" : "text-muted",
                )}
              >
                מטרי
              </button>
            </div>
          </div>

          <ServingsAdjuster servings={servings} onChange={setTargetServings} />

          <ul className="space-y-2">
            {scaledIngredients.map((ingredient, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                {ingredient.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h2 className="font-semibold text-foreground">הוראות הכנה</h2>
            {recipe.instructions.some((step) => parseTimersInText(step).length > 0) && (
              <p className="flex items-center gap-1 text-xs text-muted">
                <Timer className="size-3.5 text-accent" />
                לחצו על זמן מסומן כדי להפעיל טיימר
              </p>
            )}
          </div>
          <ol className="space-y-4">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-medium text-muted">
                  {i + 1}
                </span>
                <span className="pt-0.5">
                  <InstructionText text={convertTemperaturesInText(step, unitSystem)} />
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="למחוק את המתכון?"
      >
        <p className="mb-4 text-sm text-muted">
          הפעולה תמחק לצמיתות את &quot;{recipe.title}&quot;. לא ניתן לבטל פעולה זו.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            ביטול
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={deleteRecipe.isPending}
          >
            מחיקה
          </Button>
        </div>
      </Modal>
    </div>
  );
}
