export type TimerMatch = {
  start: number;
  end: number;
  label: string;
  minutes: number;
};

const UNIT_PATTERN = "(?:hours?|hrs?|שעות|שעה|minutes?|mins?|min|דקות|דקה)";

const NUMERIC_REGEX = new RegExp(
  `(\\d+)\\s*(?:[-–]\\s*(\\d+)\\s*)?\\s*(${UNIT_PATTERN})(?:\\s+(?:and\\s+)?(\\d+)\\s*(${UNIT_PATTERN}))?`,
  "gi",
);

// Common Hebrew ways of saying a duration without a digit at all — "half an
// hour", "a quarter hour", "an hour and a half" — which the numeric regex
// above can't catch since it requires a leading number.
const WORDY_REGEX = /(שעה\s+וחצי|חצי\s+שעה|רבע\s+שעה|שעה(?!\s*(?:וחצי|ות))|דקה(?!\s*ות))/gi;

function isHourUnit(unit: string): boolean {
  return /hour|hr|שע/i.test(unit);
}

function unitToMinutes(value: number, unit: string): number {
  return isHourUnit(unit) ? value * 60 : value;
}

function wordyPhraseToMinutes(phrase: string): number {
  const normalized = phrase.trim();
  if (/שעה\s+וחצי/.test(normalized)) return 90;
  if (/חצי\s+שעה/.test(normalized)) return 30;
  if (/רבע\s+שעה/.test(normalized)) return 15;
  if (/^שעה$/.test(normalized)) return 60;
  if (/^דקה$/.test(normalized)) return 1;
  return 0;
}

function overlaps(a: TimerMatch, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

export function parseTimersInText(text: string): TimerMatch[] {
  const matches: TimerMatch[] = [];

  NUMERIC_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NUMERIC_REGEX.exec(text))) {
    const [full, numRaw, rangeRaw, unitRaw, extraNumRaw, extraUnitRaw] = match;
    const num = Number(numRaw);
    let minutes = unitToMinutes(num, unitRaw);

    if (extraNumRaw && extraUnitRaw) {
      minutes += unitToMinutes(Number(extraNumRaw), extraUnitRaw);
    } else if (rangeRaw) {
      // Use the upper end of a range ("20-25 minutes") as the timer duration.
      minutes = unitToMinutes(Number(rangeRaw), unitRaw);
    }

    if (minutes <= 0) continue;
    matches.push({ start: match.index, end: match.index + full.length, label: full.trim(), minutes });
  }

  WORDY_REGEX.lastIndex = 0;
  while ((match = WORDY_REGEX.exec(text))) {
    const full = match[0];
    const minutes = wordyPhraseToMinutes(full);
    if (minutes <= 0) continue;

    const candidate = { start: match.index, end: match.index + full.length };
    if (matches.some((m) => overlaps(m, candidate))) continue;
    matches.push({ ...candidate, label: full.trim(), minutes });
  }

  return matches.sort((a, b) => a.start - b.start);
}
