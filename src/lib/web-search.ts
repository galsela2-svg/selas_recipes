import { BROWSER_LIKE_HEADERS } from "@/lib/recipe-scraper";

export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

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

// Scrapes DuckDuckGo's no-JS HTML results page — there's no official
// key-free search API, and this is a well-established technique for
// side projects. Markup is unversioned and may drift over time.
export async function searchWeb(
  query: string,
  limit = 6,
): Promise<WebSearchResult[]> {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  const response = await fetch(searchUrl, {
    headers: BROWSER_LIKE_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }

  const html = await response.text();

  const titleMatches = [
    ...html.matchAll(
      /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    ),
  ];
  const snippetMatches = [
    ...html.matchAll(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi),
  ];

  const results: WebSearchResult[] = [];

  for (let i = 0; i < titleMatches.length && results.length < limit; i++) {
    const href = titleMatches[i][1];
    const title = stripTags(titleMatches[i][2]);
    const url = resolveDdgUrl(href);
    if (!url || !title) continue;

    results.push({
      title,
      url,
      snippet: snippetMatches[i] ? stripTags(snippetMatches[i][1]) : "",
    });
  }

  return results;
}
