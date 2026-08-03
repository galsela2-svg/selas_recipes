import { BROWSER_LIKE_HEADERS } from "@/lib/recipe-scraper";

export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export class WebSearchFailedError extends Error {}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

function resolveDdgUrl(href: string): string | null {
  const decoded = decodeEntities(href);
  try {
    const absolute = decoded.startsWith("//") ? `https:${decoded}` : decoded;
    const parsed = new URL(absolute, "https://duckduckgo.com");
    const uddg = parsed.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    if (parsed.hostname.endsWith("duckduckgo.com")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function fetchDdgHtml(url: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: BROWSER_LIKE_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.name : String(err);
    throw new WebSearchFailedError(`Request to ${url} failed before a response arrived (${reason})`);
  }

  if (!response.ok) {
    throw new WebSearchFailedError(`${url} responded with status ${response.status}`);
  }

  return response.text();
}

// Result markup differs between the two endpoints below (class-based on
// html.duckduckgo.com, none on lite.duckduckgo.com) — but a real result
// link is identifiable the same way on both: it routes through DDG's
// `/l/?uddg=` redirect (resolveDdgUrl returns non-null for those, and null
// for DuckDuckGo's own nav/logo links). This one parser covers both without
// depending on either page's exact CSS classes, which is what actually
// drifts over time.
function parseResultLinks(html: string): WebSearchResult[] {
  const anchorMatches = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];

  const pool: WebSearchResult[] = [];
  const seen = new Set<string>();
  for (const match of anchorMatches) {
    const url = resolveDdgUrl(match[1]);
    const title = stripTags(match[2]);
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);
    pool.push({ title, url, snippet: "" });
  }
  return pool;
}

// Scrapes DuckDuckGo's no-JS HTML results — there's no official key-free
// search API, and this is a well-established technique for side projects.
// Tries the full "html" endpoint first (has snippets); if that request
// fails outright (blocked, timed out, non-2xx — datacenter IPs like
// Vercel's serverless functions get this more often than a residential
// browser would), falls back to the simpler "lite" endpoint, which tends to
// face less aggressive bot-detection. Only throws (WebSearchFailedError) if
// both fail, with the original (usually more informative) error attached.
//
// DuckDuckGo returns the same top results for the same query every time, so
// repeated searches (or "surprise me again") kept surfacing the same
// handful of sites. Pulling a wider pool and shuffling it before trimming
// to `limit` spreads results across more sites without hurting topical
// relevance (everything in the pool still matched the query).
export async function searchWeb(
  query: string,
  limit = 6,
): Promise<WebSearchResult[]> {
  let html: string;
  try {
    html = await fetchDdgHtml(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
  } catch (primaryErr) {
    try {
      html = await fetchDdgHtml(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`);
    } catch {
      console.error("DuckDuckGo search failed on both endpoints", primaryErr);
      throw primaryErr;
    }
  }

  const pool = parseResultLinks(html);
  return shuffle(pool).slice(0, limit);
}
