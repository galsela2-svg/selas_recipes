"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  Clock,
  ExternalLink,
  Heart,
  ImageOff,
  Pencil,
  ShoppingCart,
  Timer,
  Trash2,
  Users,
} from "lucide-react";
import { useDeleteRecipe, useRecipe, useToggleFavorite } from "@/lib/queries/recipes";
import { useAddShoppingItems } from "@/lib/queries/shopping-list";
import { usePantryItems, isIngredientInPantry } from "@/lib/queries/pantry";
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
import { RecipePhotoGallery } from "@/components/recipes/recipe-photo-gallery";
import { ServingsAdjuster } from "@/components/recipes/servings-adjuster";
import { InstructionText } from "@/components/recipes/instruction-text";
import { CookLogSection } from "@/components/recipes/cook-log-section";
import { AiUpgradePanel } from "@/components/recipes/ai-upgrade-panel";
import { useSettings } from "@/components/providers/settings-provider";

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: recipe, isLoading } = useRecipe(id);
  const { data: pantryItems } = usePantryItems();
  const deleteRecipe = useDeleteRecipe();
  const addShoppingItems = useAddShoppingItems();
  const toggleFavorite = useToggleFavorite();
  const [settings] = useSettings();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [added, setAdded] = useState(false);
  const [targetServings, setTargetServings] = useState<number | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => settings.defaultUnitSystem);
  const [hideHavePantryItems, setHideHavePantryItems] = useState(false);

  const baseServings = recipe?.servings ?? 1;
  const servings = targetServings ?? baseServings;
  const multiplier = servings / baseServings;
  const pantryNames = useMemo(() => (pantryItems ?? []).map((p) => p.name), [pantryItems]);

  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];
    return recipe.ingredients.map((ingredient) => {
      const scaled = scaleIngredientText(ingredient, multiplier);
      const converted = convertIngredientLine(scaled, unitSystem);
      const inPantry = isIngredientInPantry(ingredient, pantryNames);
      return { original: ingredient, text: converted, inPantry };
    });
  }, [recipe, multiplier, unitSystem, pantryNames]);

  const visibleIngredients = hideHavePantryItems
    ? scaledIngredients.filter((i) => !i.inPantry)
    : scaledIngredients;

  const itemsForShoppingList = settings.autoHidePantryItems
    ? scaledIngredients.filter((i) => !i.inPantry)
    : scaledIngredients;

  if (isLoading || !recipe) return <Spinner />;

  const totalTime =
    (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  function handleAddToShoppingList() {
    if (!recipe || itemsForShoppingList.length === 0) return;
    addShoppingItems.mutate(
      { names: itemsForShoppingList.map((i) => i.text), recipeId: recipe.id },
      { onSuccess: () => setAdded(true) },
    );
  }

  function handleDelete() {
    deleteRecipe.mutate(id, {
      onSuccess: () => router.push("/dashboard"),
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-surface-2 shadow-sm">
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

        <button
          onClick={() =>
            toggleFavorite.mutate({ id: recipe.id, isFavorite: !recipe.is_favorite })
          }
          className="absolute end-3 top-3 flex size-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm cursor-pointer transition-transform active:scale-90"
        >
          <Heart
            className={
              recipe.is_favorite ? "size-5 fill-danger text-danger" : "size-5 text-white"
            }
          />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-end gap-3">
          <div className="flex flex-wrap gap-2">
            <Link href={`/recipes/${id}/cook`}>
              <Button variant="secondary">
                <ChefHat className="size-4" />
                בישול
              </Button>
            </Link>
            <AiUpgradePanel recipe={recipe} />
            <Link href={`/recipes/${id}/edit`}>
              <Button variant="secondary">
                <Pencil className="size-4" />
                עריכה
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
          {recipe.source_url && (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-accent"
            >
              <ExternalLink className="size-4" />
              מקור
            </a>
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

        <Button
          onClick={handleAddToShoppingList}
          loading={addShoppingItems.isPending}
          disabled={itemsForShoppingList.length === 0}
        >
          <ShoppingCart className="size-4" />
          {added
            ? "נוסף לרשימת הקניות"
            : itemsForShoppingList.length === 0
              ? "כל המרכיבים כבר יש לכם במזווה"
              : "הוספה לרשימת קניות"}
        </Button>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-foreground">תמונות מההכנה</h2>
        <RecipePhotoGallery recipeId={recipe.id} />
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-foreground">מרכיבים</h2>
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

          {pantryNames.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={hideHavePantryItems}
                onChange={(e) => setHideHavePantryItems(e.target.checked)}
                className="size-4 accent-[var(--accent)]"
              />
              הסתר מרכיבים שכבר יש לי במזווה
            </label>
          )}

          <ul className="space-y-2">
            {visibleIngredients.map((ingredient, i) => (
              <li
                key={i}
                className={cn(
                  "flex gap-2 text-sm",
                  ingredient.inPantry ? "text-muted line-through" : "text-foreground",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    ingredient.inPantry ? "bg-success" : "bg-accent",
                  )}
                />
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

      <CookLogSection recipeId={recipe.id} />

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
