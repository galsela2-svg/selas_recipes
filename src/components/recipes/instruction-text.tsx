"use client";

import { Fragment } from "react";
import { Timer } from "lucide-react";
import { parseTimersInText } from "@/lib/timer-parser";
import { useTimers } from "@/components/timers/timer-store";

export function InstructionText({ text }: { text: string }) {
  const { addTimer } = useTimers();
  const matches = parseTimersInText(text);

  if (matches.length === 0) return <>{text}</>;

  const segments: ReactSegment[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.start > cursor) segments.push({ type: "text", value: text.slice(cursor, m.start) });
    segments.push({ type: "timer", key: `${i}`, label: m.label, minutes: m.minutes });
    cursor = m.end;
  });
  if (cursor < text.length) segments.push({ type: "text", value: text.slice(cursor) });

  return (
    <>
      {segments.map((segment, i) =>
        segment.type === "text" ? (
          <Fragment key={i}>{segment.value}</Fragment>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => addTimer(segment.label, segment.minutes)}
            className="mx-1 inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 align-middle text-sm font-medium text-accent cursor-pointer hover:bg-accent/25"
          >
            <Timer className="size-3.5" />
            {segment.label}
          </button>
        ),
      )}
    </>
  );
}

type ReactSegment =
  | { type: "text"; value: string }
  | { type: "timer"; key: string; label: string; minutes: number };
