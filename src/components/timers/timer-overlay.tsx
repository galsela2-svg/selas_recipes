"use client";

import { useState } from "react";
import { Pause, Play, Timer, X } from "lucide-react";
import { useTimers, type ActiveTimer } from "@/components/timers/timer-store";
import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SNOOZE_PRESETS = [
  { label: "2 דק׳", minutes: 2 },
  { label: "5 דק׳", minutes: 5 },
  { label: "10 דק׳", minutes: 10 },
  { label: "20 דק׳", minutes: 20 },
  { label: "חצי שעה", minutes: 30 },
];

function TimerCard({ timer }: { timer: ActiveTimer }) {
  const { toggleTimer, removeTimer, snoozeTimer } = useTimers();
  const [customOpen, setCustomOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("5");

  function confirmCustomSnooze() {
    const minutes = Number(customMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    snoozeTimer(timer.id, minutes);
    setCustomOpen(false);
  }

  return (
    <div
      className={cn(
        "w-full max-w-sm rounded-xl border shadow-lg backdrop-blur",
        timer.finished ? "border-accent bg-accent/20" : "border-border bg-surface/95",
      )}
    >
      <div className={cn("flex items-center gap-3 px-4 py-3", timer.finished && "animate-pulse")}>
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

      {timer.finished && (
        <div className="flex flex-col gap-2 border-t border-accent/30 px-4 py-3">
          {customOpen ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="number"
                dir="ltr"
                min={1}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmCustomSnooze();
                  }
                }}
                className="h-8 w-20 rounded-md border border-border bg-surface px-2 text-center text-sm text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-xs text-muted">דקות</span>
              <button
                onClick={confirmCustomSnooze}
                className="mr-auto rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground cursor-pointer hover:opacity-90"
              >
                הוספה
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted">סנוז:</span>
              {SNOOZE_PRESETS.map((preset) => (
                <button
                  key={preset.minutes}
                  onClick={() => snoozeTimer(timer.id, preset.minutes)}
                  className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent cursor-pointer hover:bg-accent/20"
                >
                  {preset.label}
                </button>
              ))}
              <button
                onClick={() => setCustomOpen(true)}
                className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted cursor-pointer hover:bg-surface-2 hover:text-foreground"
              >
                ידני
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TimerOverlay() {
  const { timers } = useTimers();

  if (timers.length === 0) return null;

  return (
    <div
      className="fixed inset-x-0 z-40 flex flex-col items-center gap-2 px-4"
      style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
    >
      {timers.map((timer) => (
        <TimerCard key={timer.id} timer={timer} />
      ))}
    </div>
  );
}
