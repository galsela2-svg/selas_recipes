"use client";

import { Fragment, useState } from "react";
import { Timer } from "lucide-react";
import { parseTimersInText } from "@/lib/timer-parser";
import { findIngredientMentions } from "@/lib/ingredient-mentions";
import { useTimers } from "@/components/timers/timer-store";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";

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

  // A range timer ("20-25 דקות") opens a picker instead of starting
  // immediately — the picker's own state lives here, keyed by the match's
  // start offset (stable for a given render of this text).
  const [rangePicker, setRangePicker] = useState<{
    label: string;
    min: number;
    max: number;
  } | null>(null);
  const [pickedMinutes, setPickedMinutes] = useState("");

  // Timers were here first — an ingredient match that overlaps one (rare,
  // e.g. a quantity that looks like a duration) just loses out silently.
  const ingredientSpans = ingredientMatches.filter(
    (im) => !timerMatches.some((tm) => im.start < tm.end && tm.start < im.end),
  );

  type Span =
    | {
        type: "timer";
        start: number;
        end: number;
        label: string;
        minutes: number;
        rangeMinMinutes?: number;
        rangeMaxMinutes?: number;
      }
    | { type: "ingredient"; start: number; end: number; name: string; quantity: string };

  const spans: Span[] = [
    ...timerMatches.map((m) => ({ type: "timer" as const, ...m })),
    ...ingredientSpans.map((m) => ({ type: "ingredient" as const, ...m })),
  ].sort((a, b) => a.start - b.start);

  function handleTimerClick(segment: Extract<Span, { type: "timer" }>) {
    if (segment.rangeMinMinutes !== undefined && segment.rangeMaxMinutes !== undefined) {
      setPickedMinutes(String(segment.rangeMaxMinutes));
      setRangePicker({ label: segment.label, min: segment.rangeMinMinutes, max: segment.rangeMaxMinutes });
      return;
    }
    addTimer(segment.label, segment.minutes);
  }

  function confirmRangePicker() {
    if (!rangePicker) return;
    const minutes = Number(pickedMinutes);
    if (Number.isFinite(minutes) && minutes > 0) addTimer(rangePicker.label, minutes);
    setRangePicker(null);
  }

  const picker = rangePicker && (
    <Modal open onClose={() => setRangePicker(null)} title={`טיימר ל-${rangePicker.label}`}>
      <div className="space-y-4">
        <p className="text-sm text-muted">בחרו כמה זמן בטווח שנכתב במתכון:</p>
        <div className="flex justify-center">
          <NumberStepper
            value={pickedMinutes}
            onChange={setPickedMinutes}
            min={rangePicker.min}
            max={rangePicker.max}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRangePicker(null)}>
            ביטול
          </Button>
          <Button onClick={confirmRangePicker}>
            <Timer className="size-4" />
            התחלת טיימר
          </Button>
        </div>
      </div>
    </Modal>
  );

  if (spans.length === 0) return <>{text}{picker}</>;

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
              onClick={() => handleTimerClick(segment)}
              className="mx-1 inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 align-middle text-sm font-medium text-accent cursor-pointer hover:bg-accent/25"
            >
              <Timer className="size-3.5" />
              {segment.label}
            </button>
          );
        }

        return (
          <span key={i} className="relative inline-block whitespace-nowrap">
            <span className="pointer-events-none absolute inset-x-0 -top-4 flex justify-center whitespace-nowrap text-[11px] font-normal leading-none text-muted">
              ({segment.quantity})
            </span>
            {text.slice(segment.start, segment.end)}
          </span>
        );
      })}
      {picker}
    </>
  );
}

type ReactSegment =
  | { type: "text"; value: string }
  | {
      type: "timer";
      start: number;
      end: number;
      label: string;
      minutes: number;
      rangeMinMinutes?: number;
      rangeMaxMinutes?: number;
    }
  | { type: "ingredient"; start: number; end: number; name: string; quantity: string };
