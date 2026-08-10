// A small string hash (FNV-1a), used to derive a stable-but-arbitrary sort
// key per item for a given seed — the same seed always produces the same
// order, but each seed produces a different one.
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Shuffles items into an order that's stable for a given seed — pass a
 * fresh seed (e.g. Math.random() captured once per mount) to reshuffle
 * "on every visit" without the order jittering on every re-render or
 * every time the underlying list updates. */
export function shuffleWithSeed<T>(items: T[], keyFn: (item: T) => string, seed: number): T[] {
  return items
    .map((item) => ({ item, sortKey: hashString(`${seed}:${keyFn(item)}`) }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ item }) => item);
}
