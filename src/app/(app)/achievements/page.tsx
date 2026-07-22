"use client";

import { Check, Flame } from "lucide-react";
import { useRecipes } from "@/lib/queries/recipes";
import { useAllCookLogs } from "@/lib/queries/cook-logs";
import { usePantryItems } from "@/lib/queries/pantry";
import { useTotalPhotoCount } from "@/lib/queries/recipe-photos";
import { computeAchievements, computeCookingStreak } from "@/lib/achievements";
import { CoupleStatsCard } from "@/components/achievements/couple-stats-card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export default function AchievementsPage() {
  const { data: recipes, isLoading: recipesLoading } = useRecipes();
  const { data: cookLogs, isLoading: logsLoading } = useAllCookLogs();
  const { data: pantryItems } = usePantryItems();
  const { data: photoCount } = useTotalPhotoCount();

  if (recipesLoading || logsLoading || !recipes || !cookLogs) return <Spinner />;

  const streak = computeCookingStreak(cookLogs);
  const achievements = computeAchievements({
    recipes,
    cookLogs,
    pantryCount: pantryItems?.length ?? 0,
    photoCount: photoCount ?? 0,
  });
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm text-muted">
        {unlockedCount} מתוך {achievements.length} הישגים נפתחו
      </p>

      {streak > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
          <Flame className="size-6 shrink-0 text-accent" />
          <div>
            <p className="font-semibold text-foreground">רצף של {streak} ימים!</p>
            <p className="text-xs text-muted">בישלתם {streak} ימים ברצף. תמשיכו ככה!</p>
          </div>
        </div>
      )}

      <CoupleStatsCard recipes={recipes} cookLogs={cookLogs} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {achievements.map((a) => (
          <div
            key={a.id}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border p-4 text-center",
              a.unlocked
                ? "border-accent/40 bg-accent/10"
                : "border-border bg-surface opacity-60",
            )}
          >
            <a.icon
              className={cn("size-8", a.unlocked ? "text-accent" : "text-muted")}
              strokeWidth={1.75}
            />
            <p className="text-sm font-semibold text-foreground">{a.title}</p>
            <p className="text-xs text-muted">{a.description}</p>
            {!a.unlocked && (
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${(a.current / a.target) * 100}%` }}
                />
              </div>
            )}
            <p className="flex items-center gap-1 text-[11px] text-muted">
              {a.unlocked ? (
                <>
                  <Check className="size-3" />
                  פתוח
                </>
              ) : (
                `${a.current}/${a.target}`
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
