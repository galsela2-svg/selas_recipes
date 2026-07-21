import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  active,
  onClick,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const interactive = typeof onClick === "function";

  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-border bg-surface-2 text-muted",
        interactive && "cursor-pointer hover:border-accent/60",
        className,
      )}
    >
      {children}
    </span>
  );
}
