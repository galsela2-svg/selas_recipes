import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <UtensilsCrossed className="size-12 text-muted" strokeWidth={1.5} />
      <div className="space-y-1">
        <h1 className="font-serif text-2xl font-bold text-foreground">הצלחת לגמור?</h1>
        <p className="text-sm text-muted">
          הדף הזה ריק — ייתכן שהקישור שגוי, או שהמתכון הוסר.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90"
      >
        לדף הבית
      </Link>
    </div>
  );
}
