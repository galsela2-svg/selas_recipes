"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Dices, ImageOff, PartyPopper, RotateCcw } from "lucide-react";
import { useRecipes } from "@/lib/queries/recipes";
import { useTags } from "@/lib/queries/tags";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/lib/types";

const SPIN_STEPS = 22;

export default function RoulettePage() {
  const { data: recipes, isLoading } = useRecipes();
  const tags = useTags();
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [displayed, setDisplayed] = useState<Recipe | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pool = useMemo(() => {
    if (!recipes) return [];
    return activeTag ? recipes.filter((r) => r.tags.includes(activeTag)) : recipes;
  }, [recipes, activeTag]);

  function spin() {
    if (pool.length === 0 || spinning) return;
    setSpinning(true);
    setLanded(false);

    let step = 0;
    function tick() {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setDisplayed(pick);
      step += 1;

      if (step >= SPIN_STEPS) {
        setSpinning(false);
        setLanded(true);
        return;
      }
      // Ease out: start fast (60ms), end slow (~320ms)
      const progress = step / SPIN_STEPS;
      const delay = 60 + progress * progress * 300;
      timeoutRef.current = setTimeout(tick, delay);
    }
    tick();
  }

  function resetSpin() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDisplayed(null);
    setLanded(false);
    setSpinning(false);
  }

  if (isLoading) return <Spinner />;

  return (
    <div className="mx-auto max-w-md space-y-6">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Badge
            active={activeTag === null}
            onClick={() => {
              setActiveTag(null);
              resetSpin();
            }}
          >
            הכול
          </Badge>
          {tags.map((tag) => (
            <Badge
              key={tag}
              active={activeTag === tag}
              onClick={() => {
                setActiveTag(activeTag === tag ? null : tag);
                resetSpin();
              }}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {pool.length === 0 ? (
        <EmptyState
          icon={Dices}
          title="אין מתכונים מתאימים"
          description="נסו לבחור תגית אחרת או להסיר את הסינון."
        />
      ) : (
        <>
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border-2 bg-surface transition-colors",
              landed ? "border-accent shadow-[0_0_0_4px_rgba(0,0,0,0)]" : "border-border",
            )}
          >
            {displayed ? (
              <div className={cn(spinning && "animate-pulse")}>
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2">
                  {displayed.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayed.image_url}
                      alt={displayed.title}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted">
                      <ImageOff className="size-10" strokeWidth={1.5} />
                    </div>
                  )}
                  {landed && (
                    <div className="absolute end-3 top-3 flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg">
                      <PartyPopper className="size-5" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-serif text-xl font-bold text-foreground">{displayed.title}</h2>
                  {displayed.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {displayed.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center text-muted">
                <Dices className="size-12" strokeWidth={1.5} />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {landed ? (
              <>
                <Button variant="secondary" size="lg" className="flex-1" onClick={spin}>
                  <RotateCcw className="size-4.5" />
                  סובבו שוב
                </Button>
                <Link
                  href={`/recipes/${displayed?.id}`}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-6 text-base font-medium text-accent-foreground transition-colors hover:opacity-90"
                >
                  לצפייה במתכון
                </Link>
              </>
            ) : (
              <Button size="lg" className="w-full" onClick={spin} loading={spinning} disabled={spinning}>
                <Dices className="size-4.5" />
                {spinning ? "מסתובב..." : "סובבו את הגלגל!"}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
