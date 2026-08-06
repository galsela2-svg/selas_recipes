export type ImageSearchResult = {
  imageUrl: string;
  title: string;
  sourceUrl: string;
};

function looksLikeImageUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

type OpenverseResult = {
  title?: string;
  url?: string;
  thumbnail?: string;
  foreign_landing_url?: string;
};

// Openverse (openverse.org, run by WordPress/Automattic) is a real,
// keyless, no-signup JSON search API over openly-licensed images — unlike
// DuckDuckGo's HTML results page (see web-search.ts), it's *meant* to be
// called programmatically, so it isn't subject to the same anti-scraping
// treatment a datacenter IP (e.g. Vercel's) tends to get from a page built
// for browsers. Its index is tagged almost entirely in English though —
// callers should translate a non-English query first (see
// translate-food-query.ts) rather than pass it through as-is.
export async function searchOpenverseImages(
  query: string,
  limit: number,
): Promise<ImageSearchResult[]> {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${limit}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Openverse responded with status ${response.status}`);
  }

  const body = (await response.json()) as { results?: OpenverseResult[] };
  const images: ImageSearchResult[] = [];
  const seen = new Set<string>();
  for (const item of body.results ?? []) {
    const imageUrl = item.url ?? item.thumbnail;
    if (!imageUrl || !looksLikeImageUrl(imageUrl) || seen.has(imageUrl)) continue;
    seen.add(imageUrl);
    images.push({
      imageUrl,
      title: item.title || query,
      sourceUrl: item.foreign_landing_url || imageUrl,
    });
  }
  return images;
}
