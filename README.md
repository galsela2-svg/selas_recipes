# Recipes

A minimalist, dark-themed recipe manager for two people, built for phones and
iPad, with cloud sync via Supabase. Both accounts share the same recipes and
shopping list in real time.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Supabase (Postgres, Auth, Row Level Security, Realtime, Storage)
- TanStack React Query for server state and live sync
- Gemini (via `@google/genai`) for the link/photo/text import parsing
- Lucide React icons

## 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). It creates:
   - `recipes` (with structured `dietary_tags`), `shopping_list_items`,
     `known_items` (autocomplete history), and `recipe_photos` (dated "real
     result" photos) — all with RLS and Realtime
   - the `recipe-photos` Storage bucket (public read, authenticated write)
   - `pantry_items` and `cook_logs` — left in the schema for backward
     compatibility with any existing data, but unused by the current
     (simplified) app
3. In **Authentication -> Providers**, make sure Email is enabled and
   **disable public sign-ups** (Authentication -> Settings) — this app is for
   exactly two people.
4. In **Authentication -> Users**, manually create the two accounts (email +
   password) you and your partner will sign in with.

If you ran an earlier version of this schema, just re-run the updated
`schema.sql` — every statement is idempotent (`create table if not exists`,
`add column if not exists`, `drop policy if exists` + recreate, a guarded
realtime-publication loop, etc.), so it's safe to run again.

## 2. Configure environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Optional — required only for recipe import (link/photo/text)
GEMINI_API_KEY=...
```

Get a Supabase URL/key from **Settings -> API** in the Supabase dashboard, and
a free Gemini key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
(no credit card required). Without `GEMINI_API_KEY`, manual recipe entry still
works normally — the import routes just show a clear "add your API key"
message instead of failing silently.

## 3. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or iPad
(or a resized browser window) and sign in with one of the two accounts you
created. The UI targets mobile/tablet screens — a bottom tab bar, large touch
targets, and a camera-first photo flow — rather than a desktop layout.

## Features

This app is deliberately simple: it manages *your own* recipe collection —
there is no built-in *recipe* web search or discovery. Getting a recipe in is
always one of three explicit actions: paste a link, snap a photo, or paste
text (web search is used in exactly one place — finding a cover *image* for
a recipe you already have, see below).

- **Auth** — email/password sign-in for the two accounts; every other page
  route is protected by `src/proxy.ts` (Next.js 16's renamed Middleware).
  The Gemini-backed API routes additionally check the Supabase session
  themselves, since Next's proxy matcher excludes `/api/*`.
- **Recipe import, three ways** (`/recipes/new`) — paste a link (any recipe
  site via JSON-LD/microdata extraction, or an Instagram Reel/post caption),
  snap or upload a photo (a cookbook page, a handwritten recipe card, or a
  screenshot — Gemini vision reads it), or paste free-form text (from a
  message, a document, WhatsApp, etc.). All three organize the result into a
  structured recipe (title, description, times, servings, ingredients,
  instructions) that you review before saving. Import also auto-suggests
  dietary/category tags and polishes the description/instructions with AI.
  A site that blocks automated access, or a photo/caption with no readable
  recipe, surfaces a clear message instead of failing silently — never a
  silent fallback to searching the web.
- **Cover image: upload or web search** — on the recipe form and the detail
  page's image editor, pick a photo from the gallery, or search the web for
  one (query defaults to the recipe's title, freely editable) and tap a
  result to use it. A picked result is downloaded and re-hosted in this
  project's own Storage bucket rather than hotlinked, since many sites block
  cross-origin image requests. This is the one deliberate exception to "no
  web search" in the app — it searches for a *picture*, not a recipe.
- **One smart search box** (dashboard) — matches recipe title, ingredients,
  and tags/categories at once, so searching "עוגה" finds cakes by title *or*
  category, and searching an ingredient finds every recipe that uses it.
- **Clear, categorized browsing** — with no search active, the dashboard
  groups your whole collection into meal-type chapters (breakfast/lunch/
  dinner/desserts), like a cookbook's table of contents, instead of one long
  undifferentiated grid.
- **Serving-size scaling** — adjust target servings and every ingredient
  quantity (fractions, unicode fractions, decimals, ranges) scales live.
- **Unit conversion** — toggle Imperial ⟷ Metric per recipe; volume-to-weight
  conversion for common baking ingredients uses a density lookup (flour,
  sugar, butter, etc.) rather than a naive ml conversion. Oven temperatures
  in instructions convert too.
- **Interactive timers** — instruction text like "25 minutes" or "1 hour" is
  detected and rendered as a tappable badge; tapping starts a floating
  countdown with an audio + visual alert when it finishes. Timers persist
  while you navigate the app.
- **Cooking Mode** — distraction-free, large-text, step-by-step view with
  live-updating ingredient scaling context, interactive timers, and a quick
  camera button. A small preview always shows what's coming next; if the
  next step should happen *alongside* the current one (detects Hebrew cues
  like "בינתיים"/"במקביל"/"תוך כדי"), it's called out as "לעשות במקביל".
- **Aisle-grouped shopping list** — unchecked items are automatically
  grouped into aisles (produce, dairy, meat/fish, bakery, frozen, beverages,
  dry goods & spices, household) via keyword matching, so a shopping trip
  follows the store layout instead of your entry order. Backed by a
  `known_items` usage table with quick-add chips for frequently-added items.
- **Dietary/category tags** — a structured, curated tag set (meal type,
  kosher category, cuisine, dietary/allergen, etc.) plus freeform tags,
  matched by the dashboard's search box.
- **Cooking photos** — dated "real result" photos, separate from the
  recipe's cover image, uploadable from the recipe page or Cooking Mode's
  camera button; tap to open a full-screen lightbox.
- **Favorites** — tap the heart on any recipe card or detail page to pin it
  to a "favorites only" filter on the dashboard.
- **Cookbook export** (`/export`) — pick recipes + an image toggle, get a
  print-formatted page (save as PDF via the browser print dialog); plus a
  full JSON/CSV data backup of your recipes.
- **Settings** (`/settings`) — light/dark/system theme, 6 accent-color
  presets, default unit system, keep-screen-awake toggle for Cooking Mode,
  timer sound toggle, and account management (change password, sign out).
- **Realtime sync** — recipes and the shopping list sync live between both
  accounts via Supabase Realtime + React Query.
- **Add to Home Screen** — a PWA manifest (`src/app/manifest.ts`) makes this
  installable as a standalone app icon on iPhone/iPad, matching the
  mobile/iPad-only design intent.

## Project structure

```
src/
  app/
    login/                    Public sign-in page
    (app)/                    Authenticated routes, wrapped in the app shell
      dashboard/               Recipe grid: one search box + categorized browsing
      export/                  Cookbook export + JSON/CSV backup
      recipes/new/             Manual entry + import (link/photo/text)
      recipes/[id]/            Recipe detail: scaling, units, photos
      recipes/[id]/edit/       Edit recipe
      shopping-list/           Shared shopping checklist with autocomplete
    recipes/[id]/cook/         Full-screen Cooking Mode (no chrome)
    export/print/              Print-formatted cookbook (no chrome)
    api/parse-recipe/          Server route: fetch + parse a recipe URL
    api/parse-instagram/       Server route: Instagram caption -> recipe
    api/parse-photo/           Server route: photo -> recipe (Gemini vision)
    api/parse-text/            Server route: free text -> recipe
    api/suggest-tags/          Server route: AI tag suggestions for a recipe
    api/polish-recipe/         Server route: AI description/instructions polish
    api/complete-recipe/       Server route: fills in missing fields after import
    api/search-images/         Server route: web image search (cover image picker)
    api/import-image/          Server route: re-hosts a picked web image to Storage
  components/
    layout/                   Top header, bottom tab bar, app shell
    dashboard/                Categorized recipe grid (meal-type chapters)
    recipes/                  Recipe card/form, import panel, servings
                               adjuster, photo gallery, timers
    timers/                   Global timer store (context) + floating overlay
    ui/                       Button, input, badge, modal, spinner, etc.
  lib/
    supabase/                 Browser/server Supabase clients + auth proxy
    queries/                  React Query hooks (recipes, shopping list, tags,
                               known items, photos)
    recipe-scraper.ts         JSON-LD / microdata Recipe extraction
    web-search.ts             No-key web search (DuckDuckGo HTML results),
                               used only by the cover-image picker
    quantity-scaling.ts       Fraction-aware ingredient quantity parsing/scaling
    unit-conversion.ts        Imperial <-> Metric conversion + density dictionary
    timer-parser.ts           Detects durations in instruction text
supabase/schema.sql           Database schema, RLS policies, Storage bucket,
                               Realtime setup
```

## Known limitations, deliberately deferred

An independent code review during development flagged a few items that
were consciously deferred rather than fixed, given the app's scale (two
users, a personal recipe collection) and "clean and simple" design goal:

- **No automated test suite.** Worth adding if this grows past a personal
  project; skipped so far to keep iteration speed on features.
- **No pagination on recipe/shopping-list queries.** Fine at hundreds of
  recipes; would need addressing only if the collection grows far larger.
- **No rate limiting on the Gemini-backed routes.** Acceptable given the
  fixed two-account trust model; would matter for a multi-tenant app.
- **Raw `<img>` instead of `next/image`.** Recipe images come from
  arbitrary external sites/uploads, so a `next/image` domain allowlist
  isn't practical without breaking imports from unlisted hosts.
- **No full Content-Security-Policy.** Basic headers (nosniff, frame
  deny, referrer policy) are set in `next.config.ts`; a strict CSP would
  need careful tuning around the inline theme-init script and Supabase
  Realtime's websocket connections.

## Known limitations

**Sites with strong bot protection.** "Parse from URL" fetches pages
server-side without a headless browser. Sites with aggressive anti-bot
vendors (PerimeterX, Akamai, etc. — notably Allrecipes and SimplyRecipes)
actively block this and there's no reliable workaround short of a full
browser render pipeline, which is out of scope here. The app detects this and
says so plainly rather than failing with a confusing error — paste the text
instead. The vast majority of food-blog sites (including WordPress + Recipe
Maker-style sites, which is most Hebrew recipe blogs) work fine.

**Instagram import is caption-only.** It cannot watch or transcribe the video
— only the post's caption text is analyzed. A recipe conveyed purely through
spoken narration in the video, with no written recipe in the caption, won't
be found; copy the caption manually into the "טקסט" import tab if needed.

**Photo import needs a readable recipe in frame.** Gemini vision reads the
text in the photo, not the dish itself — a blurry, cropped, or low-light
photo of the recipe text may not extract cleanly. Retaking the photo usually
fixes it.

**Ingredient parsing is text-based, not a database.** The serving-size
scaler and unit converter work on the *leading quantity* of each ingredient
line via regex/heuristics — they don't have a true ingredient database, so
unusual phrasing (quantity not at the start of the line, uncommon
abbreviations) may pass through unconverted rather than guessing wrong.
Volume-to-weight conversion for dry goods uses an approximate density table
for common baking ingredients; it's a reasonable kitchen reference, not a lab
measurement.
