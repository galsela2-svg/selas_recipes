"use client";

import { Fragment } from "react";
import { Timer } from "lucide-react";
import { parseTimersInText } from "@/lib/timer-parser";
import { findIngredientMentions } from "@/lib/ingredient-mentions";
import { useTimers } from "@/components/timers/timer-store";

export function InstructionText({
  text,
  ingredients,
}: {
  text: string;
  /** When given, mentions of these ingredients in the text get their
   * quantity shown as a small annotation above the word (cooking mode). */
  ingredients?: string[];
}) {
  const { addTimer } = useTimers();
  const timerMatches = parseTimersInText(text);
  const ingredientMatches = ingredients ? findIngredientMentions(text, ingredients) : [];

  // Timers were here first — an ingredient match that overlaps one (rare,
  // e.g. a quantity that looks like a duration) just loses out silently.
  const ingredientSpans = ingredientMatches.filter(
    (im) => !timerMatches.some((tm) => im.start < tm.end && tm.start < im.end),
  );

  type Span =
    | { type: "timer"; start: number; end: number; label: string; minutes: number }
    | { type: "ingredient"; start: number; end: number; name: string; quantity: string };

  const spans: Span[] = [
    ...timerMatches.map((m) => ({ type: "timer" as const, ...m })),
    ...ingredientSpans.map((m) => ({ type: "ingredient" as const, ...m })),
  ].sort((a, b) => a.start - b.start);

  if (spans.length === 0) return <>{text}</>;

  const segments: ReactSegment[] = [];
  let cursor = 0;
  spans.forEach((span) => {
    if (span.start > cursor) segments.push({ type: "text", value: text.slice(cursor, span.start) });
    segments.push(span);
    cursor = span.end;
  });
  if (cursor < text.length) segments.push({ type: "text", value: text.slice(cursor) });

  return (
    <>
      {segments.map((segment, i) => {
        if (segment.type === "text") return <Fragment key={i}>{segment.value}</Fragment>;

        if (segment.type === "timer") {
          return (
            <button
              key={i}
              type="button"
              onClick={() => addTimer(segment.label, segment.minutes)}
              className="mx-1 inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 align-middle text-sm font-medium text-accent cursor-pointer hover:bg-accent/25"
            >
              <Timer className="size-3.5" />
              {segment.label}
            </button>
          );
        }

        return (
          <ruby key={i} className="mx-0.5">
            {text.slice(segment.start, segment.end)}
            <rt className="text-[11px] font-normal leading-none text-muted">
              ({segment.quantity})
            </rt>
          </ruby>
        );
      })}
    </>
  );
}

type ReactSegment =
  | { type: "text"; value: string }
  | { type: "timer"; start: number; end: number; label: string; minutes: number }
  | { type: "ingredient"; start: number; end: number; name: string; quantity: string };
