export type TimerMatch = {
  start: number;
  end: number;
  label: string;
  minutes: number;
};

const UNIT_PATTERN = "(?:hours?|hrs?|שעות|שעה|minutes?|mins?|min|דקות|דקה)";
const TIME_REGEX = new RegExp(
  `(\\d+)\\s*(?:[-–]\\s*(\\d+)\\s*)?\\s*(${UNIT_PATTERN})(?:\\s+(?:and\\s+)?(\\d+)\\s*(${UNIT_PATTERN}))?`,
  "gi",
);

function isHourUnit(unit: string): boolean {
  return /hour|hr|שע/i.test(unit);
}

function unitToMinutes(value: number, unit: string): number {
  return isHourUnit(unit) ? value * 60 : value;
}

export function parseTimersInText(text: string): TimerMatch[] {
  const matches: TimerMatch[] = [];
  let match: RegExpExecArray | null;
  TIME_REGEX.lastIndex = 0;

  while ((match = TIME_REGEX.exec(text))) {
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

    matches.push({
      start: match.index,
      end: match.index + full.length,
      label: full.trim(),
      minutes,
    });
  }

  return matches;
}
