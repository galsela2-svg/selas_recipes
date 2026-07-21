-- Recipe Management App schema
-- Run this once in the Supabase SQL editor for your project.
--
-- Data model: this app is built for a fixed pair of users who share
-- every recipe and shopping list item (a household recipe book), not
-- per-user private data. Access is restricted to authenticated users;
-- create exactly the two accounts you need in Supabase Auth (email/
-- password) and do not enable public sign-ups.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- recipes
-- ---------------------------------------------------------------------------
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  source_url text,
  prep_time_minutes integer,
  cook_time_minutes integer,
  servings integer,
  ingredients jsonb not null default '[]'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}'::text[],
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Structured dietary/allergen attributes, separate from freeform tags, for
-- the multi-select filter sidebar (e.g. Low-Carb, Gluten-Free, Dairy-Free).
alter table public.recipes
  add column if not exists dietary_tags text[] not null default '{}'::text[];

create index if not exists recipes_created_at_idx on public.recipes (created_at desc);
create index if not exists recipes_tags_idx on public.recipes using gin (tags);
create index if not exists recipes_dietary_tags_idx on public.recipes using gin (dietary_tags);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
  before update on public.recipes
  for each row
  execute function public.set_updated_at();

alter table public.recipes enable row level security;

drop policy if exists "Authenticated users can read recipes" on public.recipes;
create policy "Authenticated users can read recipes"
  on public.recipes for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert recipes" on public.recipes;
create policy "Authenticated users can insert recipes"
  on public.recipes for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update recipes" on public.recipes;
create policy "Authenticated users can update recipes"
  on public.recipes for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete recipes" on public.recipes;
create policy "Authenticated users can delete recipes"
  on public.recipes for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- shopping_list_items
-- ---------------------------------------------------------------------------
create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  checked boolean not null default false,
  recipe_id uuid references public.recipes (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists shopping_list_items_created_at_idx
  on public.shopping_list_items (created_at);

alter table public.shopping_list_items enable row level security;

drop policy if exists "Authenticated users can read shopping list" on public.shopping_list_items;
create policy "Authenticated users can read shopping list"
  on public.shopping_list_items for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert shopping list items" on public.shopping_list_items;
create policy "Authenticated users can insert shopping list items"
  on public.shopping_list_items for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update shopping list items" on public.shopping_list_items;
create policy "Authenticated users can update shopping list items"
  on public.shopping_list_items for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete shopping list items" on public.shopping_list_items;
create policy "Authenticated users can delete shopping list items"
  on public.shopping_list_items for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- known_items: a durable, ever-growing pool of ingredient / shopping-list
-- text you've entered before, so the app can suggest it instead of you
-- retyping it. Rows are never deleted by app usage (unlike shopping list
-- items, which get cleared), so suggestions persist across shopping trips.
-- ---------------------------------------------------------------------------
create table if not exists public.known_items (
  name text primary key,
  use_count integer not null default 1,
  updated_at timestamptz not null default now()
);

-- Pinned items always show first in the quick-add bar, regardless of
-- use_count, and are unaffected by the "top N by frequency" cutoff.
alter table public.known_items
  add column if not exists pinned boolean not null default false;

create index if not exists known_items_pinned_use_count_idx
  on public.known_items (pinned desc, use_count desc);

alter table public.known_items enable row level security;

drop policy if exists "Authenticated users can read known items" on public.known_items;
create policy "Authenticated users can read known items"
  on public.known_items for select
  to authenticated
  using (true);

-- Incrementing use_count happens through record_known_item() (security
-- definer below). These direct policies cover the management drawer:
-- manually adding, renaming, pinning, and deleting suggestions.
drop policy if exists "Authenticated users can insert known items" on public.known_items;
create policy "Authenticated users can insert known items"
  on public.known_items for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update known items" on public.known_items;
create policy "Authenticated users can update known items"
  on public.known_items for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete known items" on public.known_items;
create policy "Authenticated users can delete known items"
  on public.known_items for delete
  to authenticated
  using (true);

create or replace function public.record_known_item(item_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if item_name is null or btrim(item_name) = '' then
    return;
  end if;

  insert into public.known_items (name, use_count, updated_at)
  values (btrim(item_name), 1, now())
  on conflict (name)
  do update set
    use_count = public.known_items.use_count + 1,
    updated_at = now();
end;
$$;

grant execute on function public.record_known_item(text) to authenticated;

-- ---------------------------------------------------------------------------
-- recipe_photos: user-taken "real result" photos, kept separate from the
-- recipe's cover image (recipes.image_url) and date-stamped so they can be
-- shown as a dated cooking history.
-- ---------------------------------------------------------------------------
create table if not exists public.recipe_photos (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  url text not null,
  taken_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists recipe_photos_recipe_id_idx on public.recipe_photos (recipe_id);

-- One-time migration from the earlier flat `recipes.photos text[]` column,
-- if it still exists on this database.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'recipes' and column_name = 'photos'
  ) then
    insert into public.recipe_photos (recipe_id, url, taken_at, created_by)
    select r.id, photo_url, r.created_at, r.created_by
    from public.recipes r, unnest(r.photos) as photo_url
    where r.photos is not null and array_length(r.photos, 1) > 0;

    alter table public.recipes drop column photos;
  end if;
end $$;

alter table public.recipe_photos enable row level security;

drop policy if exists "Authenticated users can read recipe photos" on public.recipe_photos;
create policy "Authenticated users can read recipe photos"
  on public.recipe_photos for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert recipe photos" on public.recipe_photos;
create policy "Authenticated users can insert recipe photos"
  on public.recipe_photos for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can delete recipe photos" on public.recipe_photos;
create policy "Authenticated users can delete recipe photos"
  on public.recipe_photos for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- pantry_items: staple items you currently have at home, shared between
-- both users, used to highlight/filter missing ingredients on a recipe.
-- ---------------------------------------------------------------------------
create table if not exists public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.pantry_items enable row level security;

drop policy if exists "Authenticated users can read pantry items" on public.pantry_items;
create policy "Authenticated users can read pantry items"
  on public.pantry_items for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert pantry items" on public.pantry_items;
create policy "Authenticated users can insert pantry items"
  on public.pantry_items for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can delete pantry items" on public.pantry_items;
create policy "Authenticated users can delete pantry items"
  on public.pantry_items for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- cook_logs: "cooked on [date]" history with a 1-10 rating and personal
-- notes/tweaks, shown chronologically at the bottom of the recipe view.
-- ---------------------------------------------------------------------------
create table if not exists public.cook_logs (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  cooked_on date not null default current_date,
  rating integer check (rating between 1 and 10),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists cook_logs_recipe_id_idx on public.cook_logs (recipe_id);

alter table public.cook_logs enable row level security;

drop policy if exists "Authenticated users can read cook logs" on public.cook_logs;
create policy "Authenticated users can read cook logs"
  on public.cook_logs for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert cook logs" on public.cook_logs;
create policy "Authenticated users can insert cook logs"
  on public.cook_logs for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can delete cook logs" on public.cook_logs;
create policy "Authenticated users can delete cook logs"
  on public.cook_logs for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Storage: a public bucket for in-progress cooking photos. Public read
-- keeps the app simple (no signed-URL refreshing); writes are restricted
-- to the two authenticated accounts.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload recipe photos" on storage.objects;
create policy "Authenticated users can upload recipe photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'recipe-photos');

drop policy if exists "Authenticated users can delete recipe photos" on storage.objects;
create policy "Authenticated users can delete recipe photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'recipe-photos');

drop policy if exists "Anyone can view recipe photos" on storage.objects;
create policy "Anyone can view recipe photos"
  on storage.objects for select
  to public
  using (bucket_id = 'recipe-photos');

-- ---------------------------------------------------------------------------
-- Realtime: broadcast row changes for live sync between the two users.
-- Guarded so re-running this script doesn't error on tables already added.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'recipes',
    'shopping_list_items',
    'known_items',
    'recipe_photos',
    'pantry_items',
    'cook_logs'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
