import Link from "next/link";
import { ChefHat, Settings } from "lucide-react";

export function TopHeader({ userEmail }: { userEmail: string | null }) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        height: "calc(3.5rem + env(safe-area-inset-top))",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <ChefHat className="size-4" />
        </div>
        <span className="font-semibold text-foreground">מתכונים</span>
      </div>

      <Link
        href="/settings"
        title={userEmail ?? "הגדרות"}
        className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <Settings className="size-4.5" />
      </Link>
    </header>
  );
}
