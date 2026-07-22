"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Flame, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Flame className="size-12 text-danger" strokeWidth={1.5} />
      <div className="space-y-1">
        <h1 className="font-serif text-2xl font-bold text-foreground">אופס, משהו נשרף בתנור</h1>
        <p className="text-sm text-muted">
          קרתה שגיאה בלתי צפויה. אפשר לנסות שוב או לחזור לדף הבית.
        </p>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={reset}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 cursor-pointer"
        >
          <RefreshCw className="size-4" />
          נסו שוב
        </button>
        <Link
          href="/dashboard"
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
        >
          לדף הבית
        </Link>
      </div>
    </div>
  );
}
