"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Pencil, Sparkles } from "lucide-react";
import { DIETARY_TAG_GROUPS, type ParsedRecipe, type Recipe, type RecipeInput } from "@/lib/types";
import { linesToList, listToLines } from "@/lib/utils";
import { PENDING_IMPORT_KEY } from "@/lib/pending-import";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/recipes/tag-input";
import { ParseUrlPanel } from "@/components/recipes/parse-url-panel";
import { ImageField } from "@/components/recipes/image-field";
import { IngredientListInput } from "@/components/recipes/ingredient-list-input";
import { NumberStepper } from "@/components/ui/number-stepper";

// Picks up a recipe handed off from the web-search results page, if any.
// Reading + clearing sessionStorage here (inside a lazy useState
// initializer) runs exactly once on mount, before first paint.
function readPendingImport(skip: boolean): ParsedRecipe | null {
  if (skip || typeof window === "undefined") return null;
  const pending = sessionStorage.getItem(PENDING_IMPORT_KEY);
  if (!pending) return null;
  sessionStorage.removeItem(PENDING_IMPORT_KEY);
  try {
    return JSON.parse(pending) as ParsedRecipe;
  } catch {
    return null;
  }
}

export function RecipeForm({
  initialRecipe,
  onSubmit,
  submitLabel,
  submitting,
}: {
  initialRecipe?: Recipe;
  onSubmit: (input: RecipeInput) => void;
  submitLabel: string;
  submitting?: boolean;
}) {
  const [pendingImport] = useState(() => readPendingImport(Boolean(initialRecipe)));
  // New, empty recipes start collapsed to just the import panel — most
  // recipes here come from pasting an Instagram/recipe link, not typing.
  // Editing an existing recipe, or already having parsed/imported data,
  // shows the full form immediately.
  const [manualExpanded, setManualExpanded] = useState(
    () => Boolean(initialRecipe) || Boolean(pendingImport),
  );

  const [title, setTitle] = useState(
    initialRecipe?.title ?? pendingImport?.title ?? "",
  );
  const [description, setDescription] = useState(
    initialRecipe?.description ?? pendingImport?.description ?? "",
  );
  const [imageUrl, setImageUrl] = useState(
    initialRecipe?.image_url ?? pendingImport?.image_url ?? "",
  );
  const [sourceUrl, setSourceUrl] = useState(
    initialRecipe?.source_url ?? pendingImport?.source_url ?? "",
  );
  const [prepTime, setPrepTime] = useState(
    (initialRecipe?.prep_time_minutes ?? pendingImport?.prep_time_minutes)?.toString() ?? "",
  );
  const [cookTime, setCookTime] = useState(
    (initialRecipe?.cook_time_minutes ?? pendingImport?.cook_time_minutes)?.toString() ?? "",
  );
  const [servings, setServings] = useState(
    (initialRecipe?.servings ?? pendingImport?.servings)?.toString() ?? "",
  );
  const [ingredients, setIngredients] = useState<string[]>(
    initialRecipe?.ingredients ?? pendingImport?.ingredients ?? [],
  );
  const [instructionsText, setInstructionsText] = useState(
    listToLines(initialRecipe?.instructions ?? pendingImport?.instructions),
  );
  const [tags, setTags] = useState<string[]>(initialRecipe?.tags ?? []);
  const [dietaryTags, setDietaryTags] = useState<string[]>(
    initialRecipe?.dietary_tags ?? [],
  );
  const [suggestingTags, setSuggestingTags] = useState(false);
  const [suggestTagsError, setSuggestTagsError] = useState<string | null>(null);

  // Suggests tags from the given recipe content and merges them into
  // whatever's already selected — never removes a tag the user picked
  // themselves, just adds the ones AI thinks apply.
  async function suggestTags(recipe: {
    title: string;
    description: string;
    ingredients: string[];
    instructions: string[];
  }) {
    setSuggestingTags(true);
    setSuggestTagsError(null);
    try {
      const res = await fetch("/api/suggest-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipe),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "לא הצלחנו להציע תגיות.");

      const suggested = body.tags as string[];
      setDietaryTags((prev) => Array.from(new Set([...prev, ...suggested])));
    } catch (err) {
      setSuggestTagsError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setSuggestingTags(false);
    }
  }

  function applyParsedRecipe(parsed: ParsedRecipe) {
    setTitle(parsed.title);
    setDescription(parsed.description ?? "");
    setImageUrl(parsed.image_url ?? "");
    setSourceUrl(parsed.source_url);
    setPrepTime(parsed.prep_time_minutes?.toString() ?? "");
    setCookTime(parsed.cook_time_minutes?.toString() ?? "");
    setServings(parsed.servings?.toString() ?? "");
    setIngredients(parsed.ingredients);
    setInstructionsText(parsed.instructions.join("\n"));
    setManualExpanded(true);

    // Auto-suggest right after a successful import — the content is
    // already there, so there's no reason to make this an extra click.
    suggestTags({
      title: parsed.title,
      description: parsed.description ?? "",
      ingredients: parsed.ingredients,
      instructions: parsed.instructions,
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      source_url: sourceUrl.trim() || null,
      prep_time_minutes: prepTime ? Number(prepTime) : null,
      cook_time_minutes: cookTime ? Number(cookTime) : null,
      servings: servings ? Number(servings) : null,
      ingredients,
      instructions: linesToList(instructionsText),
      tags,
      dietary_tags: dietaryTags,
    });
  }

  function toggleDietaryTag(tag: string) {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!initialRecipe && <ParseUrlPanel onParsed={applyParsedRecipe} />}

      {!manualExpanded && (
        <button
          type="button"
          onClick={() => setManualExpanded(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground cursor-pointer"
        >
          <Pencil className="size-4" />
          או הוסיפו מתכון ידנית
        </button>
      )}

      <div className={manualExpanded ? "space-y-6" : "hidden"}>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">כותרת</label>
        <Input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="מרק העגבניות של סבתא"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          תיאור
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="תיאור קצר של המנה..."
          rows={2}
        />
      </div>

      <ImageField value={imageUrl} onChange={setImageUrl} />

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            הכנה (דק׳)
          </label>
          <NumberStepper value={prepTime} onChange={setPrepTime} step={5} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            בישול (דק׳)
          </label>
          <NumberStepper value={cookTime} onChange={setCookTime} step={5} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            מנות
          </label>
          <NumberStepper value={servings} onChange={setServings} min={1} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">תגיות</label>
        <TagInput value={tags} onChange={setTags} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">קטגוריות ותגיות</label>
          <button
            type="button"
            onClick={() =>
              suggestTags({
                title,
                description,
                ingredients,
                instructions: linesToList(instructionsText),
              })
            }
            disabled={suggestingTags || (!title.trim() && ingredients.length === 0)}
            className="flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent/80 cursor-pointer disabled:opacity-50"
          >
            {suggestingTags ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            הצעת תגיות אוטומטית
          </button>
        </div>
        {suggestTagsError && <p className="text-xs text-danger">{suggestTagsError}</p>}
        {DIETARY_TAG_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{group.label}</label>
            <div className="flex flex-wrap gap-1.5">
              {group.options.map((tag) => (
                <Badge
                  key={tag}
                  active={dietaryTags.includes(tag)}
                  onClick={() => toggleDietaryTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          מרכיבים
        </label>
        <p className="text-xs text-muted">
          הקלידו מרכיב ולחצו Enter. תופיע השלמה אוטומטית לפי מה שהזנתם בעבר.
        </p>
        <IngredientListInput value={ingredients} onChange={setIngredients} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          הוראות הכנה
        </label>
        <p className="text-xs text-muted">שלב אחד בכל שורה.</p>
        <Textarea
          value={instructionsText}
          onChange={(e) => setInstructionsText(e.target.value)}
          placeholder={"לחמם תנור ל-200 מעלות...\nלערבב את המרכיבים היבשים...\n..."}
          rows={8}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          קישור למקור
        </label>
        <Input
          type="url"
          dir="ltr"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
      </div>
    </form>
  );
}
