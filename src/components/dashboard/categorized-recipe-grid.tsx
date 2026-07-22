"use client";

import { BookOpen, Dessert, EggFried, Sandwich, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { RecipeCard } from "@/components/recipes/recipe-card";
import type { Recipe } from "@/lib/types";

const MEAL_TYPE_SECTIONS: { tag: string; icon: LucideIcon; label: string }[] = [
  { tag: "ארוחת בוקר", icon: EggFried, label: "ארוחת בוקר" },
  { tag: "ארוחת צהריים", icon: Sandwich, label: "ארוחת צהריים" },
  { tag: "ארוחת ערב", icon: UtensilsCrossed, label: "ארוחת ערב" },
  { tag: "קינוח", icon: Dessert, label: "קינוחים" },
];

/**
 * The "browse everything" view, laid out like a cookbook's table of
 * contents — grouped into meal-type chapters (a recipe tagged for more
 * than one meal shows up in each) instead of one long undifferentiated
 * grid. Anything untagged still shows up, under "מתכונים נוספים".
 */
export function CategorizedRecipeGrid({ recipes }: { recipes: Recipe[] }) {
  const sections = MEAL_TYPE_SECTIONS.map((section) => ({
    ...section,
    recipes: recipes.filter((r) => r.dietary_tags.includes(section.tag)),
  })).filter((section) => section.recipes.length > 0);

  const categorizedIds = new Set(sections.flatMap((s) => s.recipes.map((r) => r.id)));
  const rest = recipes.filter((r) => !categorizedIds.has(r.id));

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.tag} className="space-y-3">
          <p className="flex items-center gap-1.5 font-serif text-lg font-bold text-foreground">
            <section.icon className="size-5 text-accent" />
            {section.label}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {section.recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </div>
      ))}

      {rest.length > 0 && (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 font-serif text-lg font-bold text-foreground">
            <BookOpen className="size-5 text-accent" />
            מתכונים נוספים
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {rest.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
