"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getSettings } from "@/lib/settings-store";

export type ActiveTimer = {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  running: boolean;
  finished: boolean;
};

type TimerContextValue = {
  timers: ActiveTimer[];
  addTimer: (label: string, minutes: number) => void;
  toggleTimer: (id: string) => void;
  removeTimer: (id: string) => void;
};

const TimerContext = createContext<TimerContextValue | null>(null);

function playBeep() {
  if (!getSettings().timerSoundEnabled) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      const start = now + i * 0.4;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
      gain.gain.linearRampToValueAtTime(0, start + 0.3);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.3);
    }
  } catch {
    // Audio unavailable (e.g. no user interaction yet) — visual alert still shows.
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const idCounter = useRef(0);

  const addTimer = useCallback((label: string, minutes: number) => {
    idCounter.current += 1;
    const totalSeconds = Math.round(minutes * 60);
    setTimers((prev) => [
      ...prev,
      {
        id: `timer-${Date.now()}-${idCounter.current}`,
        label,
        totalSeconds,
        remainingSeconds: totalSeconds,
        running: true,
        finished: false,
      },
    ]);
  }, []);

  const toggleTimer = useCallback((id: string) => {
    setTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, running: !t.running && !t.finished } : t)),
    );
  }, []);

  const removeTimer = useCallback((id: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) =>
        prev.map((t) => {
          if (!t.running || t.finished) return t;
          const remaining = t.remainingSeconds - 1;
          if (remaining <= 0) {
            playBeep();
            return { ...t, remainingSeconds: 0, running: false, finished: true };
          }
          return { ...t, remainingSeconds: remaining };
        }),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <TimerContext.Provider value={{ timers, addTimer, toggleTimer, removeTimer }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimers() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimers must be used within a TimerProvider");
  return ctx;
}
