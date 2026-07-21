"use client";

import { useState, type FormEvent } from "react";
import { Star, Trash2 } from "lucide-react";
import { useAddCookLog, useCookLogs, useDeleteCookLog } from "@/lib/queries/cook-logs";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function CookLogSection({ recipeId }: { recipeId: string }) {
  const { data: logs } = useCookLogs(recipeId);
  const addLog = useAddCookLog();
  const deleteLog = useDeleteCookLog();
  const [showForm, setShowForm] = useState(false);
  const [cookedOn, setCookedOn] = useState(todayIsoDate());
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    addLog.mutate(
      { recipeId, cookedOn, rating, notes },
      {
        onSuccess: () => {
          setShowForm(false);
          setCookedOn(todayIsoDate());
          setRating(null);
          setNotes("");
        },
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">יומן בישול</h2>
        {!showForm && (
          <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>
            רישום בישול חדש
          </Button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-border bg-surface p-4"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">תאריך בישול</label>
            <Input
              type="date"
              dir="ltr"
              value={cookedOn}
              onChange={(e) => setCookedOn(e.target.value)}
              max={todayIsoDate()}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">דירוג</label>
            <div className="flex flex-wrap gap-1" dir="ltr">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? null : n)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md border text-xs font-medium cursor-pointer",
                    rating !== null && n <= rating
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border text-muted hover:border-accent/50",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              הערות ושינויים
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="לדוגמה: פחות מלח בפעם הבאה..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              ביטול
            </Button>
            <Button type="submit" loading={addLog.isPending}>
              שמירה
            </Button>
          </div>
        </form>
      )}

      {logs && logs.length > 0 && (
        <ul className="space-y-3">
          {logs.map((log) => (
            <li key={log.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    בושל ב-{formatDate(log.cooked_on)}
                  </p>
                  {log.rating && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-accent">
                      <Star className="size-3.5 fill-accent" />
                      {log.rating}/10
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteLog.mutate({ id: log.id, recipeId })}
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-danger cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              {log.notes && (
                <p className="mt-2 text-sm text-muted">{log.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
