export const DIETARY_TAG_OPTIONS = [
  "דל פחמימות",
  "ללא גלוטן",
  "עתיר חלבון",
  "ללא מוצרי חלב",
  "טבעוני",
  "צמחוני",
  "דל סוכר",
  "כשר",
] as const;

export type Recipe = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  source_url: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  dietary_tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RecipeInput = {
  title: string;
  description: string | null;
  image_url: string | null;
  source_url: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  dietary_tags: string[];
};

export type ShoppingListItem = {
  id: string;
  name: string;
  checked: boolean;
  recipe_id: string | null;
  recipe_title?: string | null;
  created_by: string | null;
  created_at: string;
};

export type ParsedRecipe = {
  title: string;
  description: string | null;
  image_url: string | null;
  source_url: string;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  ingredients: string[];
  instructions: string[];
};

export type RecipePhoto = {
  id: string;
  recipe_id: string;
  url: string;
  taken_at: string;
  created_by: string | null;
};

export type PantryItem = {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
};

export type CookLog = {
  id: string;
  recipe_id: string;
  cooked_on: string;
  rating: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type KnownItem = {
  name: string;
  use_count: number;
  pinned: boolean;
  updated_at: string;
};
