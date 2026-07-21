"use client";

import { useState, type FormEvent } from "react";
import { DIETARY_TAG_OPTIONS, type ParsedRecipe, type Recipe, type RecipeInput } from "@/lib/types";
import { linesToList, listToLines } from "@/lib/utils";
import { PENDING_IMPORT_KEY } from "@/lib/pending-import";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/recipes/tag-input";
import { ParseUrlPanel } from "@/components/recipes/parse-url-panel";
import { IngredientListInput } from "@/components/recipes/ingredient-list-input";

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

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          כתובת תמונה
        </label>
        <Input
          type="url"
          dir="ltr"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            הכנה (דק׳)
          </label>
          <Input
            type="number"
            dir="ltr"
            min={0}
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            בישול (דק׳)
          </label>
          <Input
            type="number"
            dir="ltr"
            min={0}
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            מנות
          </label>
          <Input
            type="number"
            dir="ltr"
            min={0}
            value={servings}
            onChange={(e) => setServings(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">תגיות</label>
        <TagInput value={tags} onChange={setTags} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          תזונה ואלרגנים
        </label>
        <div className="flex flex-wrap gap-1.5">
          {DIETARY_TAG_OPTIONS.map((tag) => (
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
    </form>
  );
}
