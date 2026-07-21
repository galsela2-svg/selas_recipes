"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinks } from "@/components/layout/nav-links";
import { cn } from "@/lib/utils";

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[max(env(safe-area-inset-bottom),0.5rem)]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {navLinks.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;

          if (link.emphasized) {
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-1 flex-col items-center justify-center gap-1 py-2"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/20">
                  <Icon className="size-5" />
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors",
                active ? "text-accent" : "text-muted",
              )}
            >
              <Icon className="size-5.5" strokeWidth={active ? 2.25 : 2} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
