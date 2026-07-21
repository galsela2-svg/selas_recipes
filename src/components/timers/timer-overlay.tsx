"use client";

import { Pause, Play, Timer, X } from "lucide-react";
import { useTimers } from "@/components/timers/timer-store";
import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TimerOverlay() {
  const { timers, toggleTimer, removeTimer } = useTimers();

  if (timers.length === 0) return null;

  return (
    <div
      className="fixed inset-x-0 z-40 flex flex-col items-center gap-2 px-4"
      style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
    >
      {timers.map((timer) => (
        <div
          key={timer.id}
          className={cn(
            "flex w-full max-w-sm items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur",
            timer.finished
              ? "border-accent bg-accent/20 animate-pulse"
              : "border-border bg-surface/95",
          )}
        >
          <Timer className={cn("size-5 shrink-0", timer.finished ? "text-accent" : "text-muted")} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted">{timer.label}</p>
            <p className="text-lg font-semibold tabular-nums text-foreground" dir="ltr">
              {timer.finished ? "הזמן נגמר!" : formatTime(timer.remainingSeconds)}
            </p>
          </div>
          {!timer.finished && (
            <button
              onClick={() => toggleTimer(timer.id)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-foreground cursor-pointer"
            >
              {timer.running ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
          )}
          <button
            onClick={() => removeTimer(timer.id)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-danger cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
