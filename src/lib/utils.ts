export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Pulls a human-readable message out of an unknown thrown value, robust to
 * cases where it isn't a true `Error` instance (e.g. a Supabase
 * PostgrestError-shaped object, or a plain string) — logs the full raw
 * value to the console either way, since fields like PostgrestError's
 * `hint`/`code`/`details` (the actually-actionable part of an RLS or schema
 * error) live outside `.message`.
 */
export function describeError(err: unknown, fallback: string): string {
  console.error(err);

  if (err instanceof Error) {
    const withDetails = err as Error & { hint?: string; code?: string; details?: string };
    const extra = [withDetails.hint, withDetails.code].filter(Boolean).join(" — ");
    return extra ? `${err.message} (${extra})` : err.message || fallback;
  }

  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message || fallback;
  }

  if (typeof err === "string" && err) return err;

  return fallback;
}

export function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function listToLines(list: string[] | null | undefined): string {
  return (list ?? []).join("\n");
}

export function formatMinutes(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} דק׳`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} שע׳ ${rest} דק׳` : `${hours} שע׳`;
}
