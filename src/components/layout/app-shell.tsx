"use client";

import type { ReactNode } from "react";
import { TopHeader } from "@/components/layout/top-header";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { useRecipesRealtime } from "@/lib/queries/recipes";
import { useShoppingListRealtime } from "@/lib/queries/shopping-list";
import { useKnownItemsRealtime } from "@/lib/queries/known-items";

export function AppShell({
  userEmail,
  children,
}: {
  userEmail: string | null;
  children: ReactNode;
}) {
  useRecipesRealtime();
  useShoppingListRealtime();
  useKnownItemsRealtime();

  return (
    <div className="flex min-h-screen flex-col">
      <TopHeader userEmail={userEmail} />

      <main
        className="mx-auto w-full max-w-2xl flex-1 px-4 py-5"
        style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>

      <BottomTabBar />
    </div>
  );
}
