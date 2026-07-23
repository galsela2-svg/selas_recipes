import { type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  active,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  onPointerDown?: (e: PointerEvent<HTMLSpanElement>) => void;
  onPointerUp?: (e: PointerEvent<HTMLSpanElement>) => void;
  onPointerLeave?: (e: PointerEvent<HTMLSpanElement>) => void;
  onPointerCancel?: (e: PointerEvent<HTMLSpanElement>) => void;
  className?: string;
}) {
  const interactive = typeof onClick === "function";

  return (
    <span
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
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
