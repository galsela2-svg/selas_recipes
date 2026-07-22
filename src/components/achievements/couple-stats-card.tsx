"use client";

import { Crown } from "lucide-react";
import { useCurrentUserId } from "@/lib/queries/auth";
import type { CookLog, Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";

function countBy(createdBy: (string | null)[], id: string | null): number {
  if (!id) return 0;
  return createdBy.filter((c) => c === id).length;
}

export function CoupleStatsCard({
  recipes,
  cookLogs,
}: {
  recipes: Recipe[];
  cookLogs: CookLog[];
}) {
  const { data: myId } = useCurrentUserId();

  const creatorIds = Array.from(
    new Set([...recipes.map((r) => r.created_by), ...cookLogs.map((l) => l.created_by)]),
  ).filter((id): id is string => Boolean(id));

  const partnerId = creatorIds.find((id) => id !== myId) ?? null;

  // Not enough distinct activity yet to compare — nothing meaningful to show.
  if (!myId || !partnerId) return null;

  const recipeCreators = recipes.map((r) => r.created_by);
  const cookCreators = cookLogs.map((l) => l.created_by);

  const mine = {
    cooked: countBy(cookCreators, myId),
    added: countBy(recipeCreators, myId),
  };
  const partner = {
    cooked: countBy(cookCreators, partnerId),
    added: countBy(recipeCreators, partnerId),
  };

  const myTotal = mine.cooked + mine.added;
  const partnerTotal = partner.cooked + partner.added;
  const leader = myTotal === partnerTotal ? null : myTotal > partnerTotal ? "mine" : "partner";

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">מי מבשל יותר? 👩‍🍳👨‍🍳</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: "mine" as const, label: "אני", stats: mine },
          { key: "partner" as const, label: "בן/בת הזוג", stats: partner },
        ].map(({ key, label, stats }) => (
          <div
            key={key}
            className={cn(
              "space-y-1 rounded-lg border p-3 text-center",
              leader === key ? "border-accent/40 bg-accent/10" : "border-border",
            )}
          >
            <p className="flex items-center justify-center gap-1 text-xs font-medium text-muted">
              {leader === key && <Crown className="size-3.5 text-accent" />}
              {label}
            </p>
            <p className="text-2xl font-bold text-foreground">{stats.cooked}</p>
            <p className="text-[11px] text-muted">בישולים</p>
            <p className="text-xs text-muted">{stats.added} מתכונים נוספו</p>
          </div>
        ))}
      </div>
    </div>
  );
}
