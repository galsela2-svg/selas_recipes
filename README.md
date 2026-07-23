# Recipes

A minimalist, dark-themed recipe manager for two people, built for phones and
iPad, with cloud sync via Supabase. Both accounts share the same recipes,
shopping list, pantry, and cooking history in real time.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Supabase (Postgres, Auth, Row Level Security, Realtime, Storage)
- TanStack React Query for server state and live sync
- Anthropic SDK (Claude) for the AI Upgrade and Instagram-import features
- Lucide React icons

## 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). It creates:
   - `recipes` (with structured `dietary_tags`), `shopping_list_items`,
     `known_items` (autocomplete history), `recipe_photos` (dated "real
     result" photos), `pantry_items`, and `cook_logs` — all with RLS and
     Realtime
   - the `recipe-photos` Storage bucket (public read, authenticated write)
3. In **Authentication -> Providers**, make sure Email is enabled and
   **disable public sign-ups** (Authentication -> Settings) — this app is for
   exactly two people.
4. In **Authentication -> Users**, manually create the two accounts (email +
   password) you and your partner will sign in with.

If you ran an earlier version of this schema, just re-run the updated
`schema.sql` — every statement is idempotent (`create table if not exists`,
`add column if not exists`, `drop policy if exists` + recreate, a guarded
realtime-publication loop, etc.), so it's safe to run again. It also
one-time-migrates the old flat `recipes.photos` column into the new
`recipe_photos` table if it finds one.

## 2. Configure environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Optional — required only for "AI Upgrade", Instagram import, photo scan,
# and text-paste import
GEMINI_API_KEY=...
```

Get a Supabase URL/key from **Settings -> API** in the Supabase dashboard, and
a free Gemini key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
(no credit card required). Without `GEMINI_API_KEY`, every other feature works
normally — the AI-backed features just show a clear "add your API key"
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

- **Auth** — email/password sign-in for the two accounts; every other page
  route is protected by `src/proxy.ts` (Next.js 16's renamed Middleware).
  The two Claude-backed API routes additionally check the Supabase session
  themselves, since Next's proxy matcher excludes `/api/*`.
- **Recipes** — full CRUD, manual entry, "Parse from URL" (JSON-LD +
  microdata extraction, with clear messaging when a site blocks automated
  access), and web search (`/search`) that finds and auto-imports recipes
  from a topic. Search results are composed by tapping grouped tokens (dish
  type, cuisine/style, prep time, difficulty, kosher category, meal type)
  instead of typing, and when a search hit lands on a category/roundup hub
  page instead of a single recipe, the scraper follows the on-site link
  that best matches the query — one hop deeper, the way a person would
  click through — before giving up on it. Results are deduped by
  normalized URL so the same article never shows up twice. Before you
  search anything, a "אולי תאהבו" section auto-loads recipe suggestions
  biased toward what you actually cook (your most-used tags/dietary tags,
  favorites weighted higher) with a "הפתיעו אותי שוב" reroll button. Every
  import-candidate card (search results, suggestions, and the dashboard's
  "no matches" fallback) shows image + prep/cook time + an estimated
  difficulty + servings + ingredient count, and has both a full-review
  import and a one-tap "+" quick-save straight into your collection —
  saving (either way) shows a toast confirmation.
- **Instagram import** — paste a Reel/post link into "Parse from URL" and the
  server fetches the post, then asks Claude to extract a structured recipe
  from the caption. *This reads the caption text only — it does not download
  or transcribe the video/audio*, since that needs a video pipeline (yt-dlp +
  speech-to-text) outside this app's scope; most recipe accounts do put the
  full recipe in the caption, so this covers a real chunk of use. If the
  caption has no clear recipe, or Instagram blocks the fetch, it automatically
  falls back to a web search for the closest matching recipe and tells you
  it did so, instead of failing silently.
- **Photo/OCR import** — photograph a physical cookbook page or a
  handwritten recipe card and Claude's vision extracts a full structured
  recipe (title, times, servings, ingredients, steps) directly, from the
  same "Parse from URL" panel (`/api/parse-photo`).
- **AI Upgrade** — a button on the recipe page that asks Claude for creative
  variations, healthier substitutions, and flavor tips for that specific
  recipe (`/api/ai-upgrade`).
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
- **Cooking Mode step preview** — below the current step, a small preview
  always shows what's coming next so you can prepare for it. If that next
  step reads like it should happen *alongside* the current one (detects
  Hebrew cues like "בינתיים"/"במקביל"/"תוך כדי"), it's called out
  distinctly as "לעשות במקביל" instead of just "השלב הבא".
- **Pantry** (`/pantry`) — a shared checklist of staples you have at home.
  On any recipe, ingredients you already have are struck through (and can be
  hidden), and "Add to Shopping List" skips them automatically.
- **"What can I cook?"** — a dashboard toggle that sorts your whole
  collection by fewest missing ingredients against your pantry, with a
  "you have everything!" / "missing N ingredients" badge per card — no
  extra data entry, it's computed from the pantry and recipe ingredients
  you already have.
- **Full-text recipe search** — the dashboard search box matches ingredients
  and instructions, not just the title.
- **Dashboard home screen** — a magazine-style browsing experience instead
  of a flat list: a "עיון לפי קטגוריה" grid of tappable chapter tiles
  (breakfast/lunch/dinner, meat/dairy/parve, quick & easy, favorites, top
  rated, Shabbat & holidays — one tap applies the filter, no typing), a
  full-bleed hero card (your most recent favorite, or most recently added
  recipe), and horizontally-scrolling shelves — "אפשר לבשל עכשיו" (sorted
  by fewest missing pantry ingredients) and "המדורגים ביותר" (highest
  average cook-log rating) — shown whenever you're browsing without an
  active search/filter. Tiles from the same group (e.g. two meal types)
  swap instead of stacking, since tapping "ערב" after "בוקר" means "switch
  chapters," not "show recipes tagged with both." When browsing
  unfiltered, "כל המתכונים" itself is laid out like a cookbook's table of
  contents — grouped into meal-type chapters (a recipe tagged for more
  than one shows up in each), 2+ tiles per row even on a phone rather than
  one recipe spanning edge-to-edge; anything untagged still shows up under
  "מתכונים נוספים".
- **"מה מכינים היום?" quick-filter panel** — a tap-to-expand panel (next to
  search) with chip rows for prep time (short/medium/long, computed from
  the recipe, no tagging needed), a 1–5 star minimum-rating filter
  (derived from cook log ratings), and grouped curated tags — kosher
  category (meat/dairy/parve), meal type (breakfast/lunch/dinner/dessert),
  and occasion (Shabbat & holidays, kid-friendly) — alongside the existing
  dietary/allergen tags. All combine with the freeform tag and favorites
  filters. When the combined filters match nothing in your own collection,
  a "search the web" prompt translates the active filters into a query and
  offers a recipe to import straight from the results — "no matches"
  never dead-ends.
- **Aisle-grouped shopping list** — unchecked items are automatically
  grouped into aisles (produce, dairy, meat/fish, bakery, frozen, beverages,
  dry goods & spices, household) via keyword matching, so a shopping trip
  follows the store layout instead of your entry order.
- **Cooking log & rating** — log "cooked on [date]" with a 1–10 rating and
  freeform notes ("less salt next time"); shown chronologically at the
  bottom of the recipe.
- **Dietary/allergen tags** — a structured, curated tag set (Low-Carb,
  Gluten-Free, Dairy-Free, etc.), separate from freeform tags, with a
  multi-select (AND-combination) filter on the dashboard.
- **Cooking photos** — dated "real result" photos, separate from the
  recipe's cover image, uploadable from the recipe page or Cooking Mode's
  camera button; tap to open a full-screen lightbox.
- **Shopping List + Pantry-aware suggestions** — autocomplete everywhere
  (ingredients, shopping items) from a durable history of what you've typed
  before.
- **Cooking Mode** — distraction-free, large-text, step-by-step view with
  live-updating ingredient scaling context, interactive timers, and a quick
  camera button.
- **Cookbook export** (`/export`) — pick recipes + an image toggle, get a
  print-formatted page (save as PDF via the browser print dialog); plus a
  full JSON/CSV data backup of recipes, tags, and cooking history.
- **Settings** (`/settings`) — light/dark/system theme, 6 accent-color
  presets, default unit system, keep-screen-awake toggle for Cooking Mode,
  timer sound toggle, auto-hide pantry items in ingredient lists, and account
  management (change password, sign out).
- **Quick-Add Tokens** — the shopping list shows a horizontally scrollable
  row of your most-frequently-added items as one-tap chips (tap to add,
  tap again to remove), backed by a `known_items` usage table with pinning
  and a management drawer to rename/pin/delete entries.
- **Favorites** — tap the heart on any recipe card or detail page to pin it
  to a "favorites only" filter on the dashboard.
- **Achievements** (`/achievements`) — 13 badges (cooking streaks, recipes
  cooked/collected, ratings given, photos uploaded, dietary variety, etc.)
  computed live from existing data — no extra tracking tables.
- **Recipe Roulette** (`/roulette`) — a slot-machine-style random recipe
  picker, optionally filtered by tag, for "what should we cook tonight?"
  indecision.
- **Cooking Mode celebration** — finishing the last step (or tapping "סיימתי
  לבשל" on a recipe with no steps) shows a confetti celebration with
  one-tap emoji rating that logs a cook entry instantly, no form required.
- **Quick chips over typing** — one-tap category chips on the web search
  page, and one-tap "today/yesterday/day before" chips on the cook log form,
  so common actions rarely need the keyboard.
- **At-a-glance import cards** — web search results ready to import show
  image, prep+cook time, an estimated difficulty (קל → קשה מאוד, guessed
  from ingredient/step count and total time since sites rarely publish
  one), servings, and ingredient count in one compact row, instead of just
  a title and a thumbnail.
- **Realtime sync** — recipes, shopping list, pantry, and cook logs all sync
  live between both accounts via Supabase Realtime + React Query.
- **Add to Home Screen** — a PWA manifest (`src/app/manifest.ts`) makes this
  installable as a standalone app icon on iPhone/iPad, matching the
  mobile/iPad-only design intent.

## Project structure

```
src/
  app/
    login/                    Public sign-in page
    (app)/                    Authenticated routes, wrapped in the app shell
      dashboard/               Recipe grid, search, tag + dietary filters
      search/                  Web recipe search
      pantry/                  Shared pantry checklist
      export/                  Cookbook export + JSON/CSV backup
      recipes/new/             Manual entry + parse-from-URL/Instagram
      recipes/[id]/            Recipe detail: scaling, units, pantry-aware
                                ingredients, photos, cook log, AI upgrade
      recipes/[id]/edit/       Edit recipe
      shopping-list/           Shared shopping checklist with autocomplete
    recipes/[id]/cook/         Full-screen Cooking Mode (no chrome)
    export/print/              Print-formatted cookbook (no chrome)
    api/parse-recipe/          Server route: fetch + parse a recipe URL
    api/parse-instagram/       Server route: Instagram caption -> recipe (+ fallback search)
    api/search-recipes/        Server route: web search + best-effort parse
    api/ai-upgrade/            Server route: Claude recipe variations/substitutions
  components/
    layout/                   Top header, bottom tab bar, app shell
    recipes/                  Recipe card/form, servings adjuster, photo
                               gallery, cook log, AI upgrade panel, timers
    timers/                   Global timer store (context) + floating overlay
    ui/                       Button, input, badge, modal, spinner, etc.
  lib/
    supabase/                 Browser/server Supabase clients + auth proxy
    queries/                  React Query hooks (recipes, shopping list, tags,
                               known items, photos, pantry, cook logs)
    recipe-scraper.ts         JSON-LD / microdata Recipe extraction
    web-search.ts             No-key web search (DuckDuckGo HTML results)
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
- **No rate limiting on the Claude-backed routes.** Acceptable given the
  fixed two-account trust model; would matter for a multi-tenant app.
- **Raw `<img>` instead of `next/image`.** Recipe images come from
  arbitrary external sites/AI output, so a `next/image` domain allowlist
  isn't practical without breaking imports from unlisted hosts.
- **No full Content-Security-Policy.** Basic headers (nosniff, frame
  deny, referrer policy) are set in `next.config.ts`; a strict CSP would
  need careful tuning around the inline theme-init script and Supabase
  Realtime's websocket connections.

## Known limitations

**Sites with strong bot protection.** "Parse from URL" and web search fetch
pages server-side without a headless browser. Sites with aggressive anti-bot
vendors (PerimeterX, Akamai, etc. — notably Allrecipes and SimplyRecipes)
actively block this and there's no reliable workaround short of a full
browser render pipeline, which is out of scope here. The app detects this and
says so plainly rather than failing with a confusing error. The vast majority
of food-blog sites (including WordPress + Recipe Maker-style sites, which is
most Hebrew recipe blogs) work fine.

**Instagram import is caption-only.** It cannot watch or transcribe the video
— only the post's caption text is analyzed. A recipe conveyed purely through
spoken narration in the video, with no written recipe in the caption, won't
be found directly; the automatic web-search fallback usually still finds the
actual recipe if the dish is identifiable from the caption/hashtags.

**Ingredient parsing is text-based, not a database.** The serving-size
scaler and unit converter work on the *leading quantity* of each ingredient
line via regex/heuristics — they don't have a true ingredient database, so
unusual phrasing (quantity not at the start of the line, uncommon
abbreviations) may pass through unconverted rather than guessing wrong.
Volume-to-weight conversion for dry goods uses an approximate density table
for common baking ingredients; it's a reasonable kitchen reference, not a lab
measurement.
