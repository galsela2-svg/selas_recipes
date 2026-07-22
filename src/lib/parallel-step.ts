const PARALLEL_KEYWORDS = [
  "בינתיים",
  "במקביל",
  "תוך כדי",
  "בו זמנית",
  "בו-זמנית",
  "בזמן ש",
  "בעודו",
  "בעודה",
];

/** Whether an instruction step reads like it's meant to happen alongside
 * another step, rather than strictly after it (e.g. "בינתיים, קצפו..."). */
export function isParallelStep(text: string): boolean {
  return PARALLEL_KEYWORDS.some((kw) => text.includes(kw));
}
