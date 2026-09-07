export type RruleFreq = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type WeekDay = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";
export type MonthlyMode = "bymonthday" | "bysetpos";
export type RruleEndType = "never" | "count" | "until";

export interface RecurrenceState {
  freq: RruleFreq | "none";
  interval: number;
  byDay: WeekDay[];
  monthlyMode: MonthlyMode;
  byMonthDay: number;
  bySetPos: number;
  endType: RruleEndType;
  count: number;
  until: string;
}

export const WEEKDAYS: WeekDay[] = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

export const RRULE_FREQS: RruleFreq[] = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];

export const RECURRENCE_FREQ_OPTIONS: (RruleFreq | "none")[] = ["none", ...RRULE_FREQS];

export const MONTHLY_MODES: MonthlyMode[] = ["bymonthday", "bysetpos"];

export const RRULE_END_TYPES: RruleEndType[] = ["never", "count", "until"];

export const WEEKDAY_LABELS: Record<WeekDay, string> = {
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
  SU: "Sun",
};

export const BYSETPOS_LABELS: Record<number, string> = {
  1: "First",
  2: "Second",
  3: "Third",
  4: "Fourth",
  [-1]: "Last",
};

export function defaultRecurrenceState(startDate?: string): RecurrenceState {
  const dayOfMonth = startDate
    ? parseInt(startDate.split("-")[2] ?? "1", 10)
    : 1;
  return {
    freq: "none",
    interval: 1,
    byDay: [],
    monthlyMode: "bymonthday",
    byMonthDay: dayOfMonth,
    bySetPos: 1,
    endType: "never",
    count: 10,
    until: "",
  };
}

export function buildRrule(state: RecurrenceState): string | null {
  if (state.freq === "none") return null;

  const parts: string[] = [`FREQ=${state.freq}`];

  if (state.interval > 1) parts.push(`INTERVAL=${state.interval}`);

  if (state.freq === "WEEKLY") {
    const days = state.byDay.length > 0 ? state.byDay : ["MO"];
    parts.push(`BYDAY=${days.join(",")}`);
  }

  if (state.freq === "MONTHLY") {
    if (state.monthlyMode === "bymonthday") {
      parts.push(`BYMONTHDAY=${state.byMonthDay}`);
    } else {
      const day = state.byDay[0] ?? "MO";
      parts.push(`BYSETPOS=${state.bySetPos}`);
      parts.push(`BYDAY=${day}`);
    }
  }

  if (state.endType === "count" && state.count > 0) {
    parts.push(`COUNT=${state.count}`);
  } else if (state.endType === "until" && state.until) {
    const normalized = state.until.replace(/-/g, "") + "T000000Z";
    parts.push(`UNTIL=${normalized}`);
  }

  return parts.join(";");
}

function extractProp(parts: Record<string, string>, key: string): string {
  return parts[key] ?? "";
}

export function parseRrule(rrule: string): RecurrenceState {
  const cleaned = rrule.replace(/^RRULE:/i, "");
  const props: Record<string, string> = {};
  for (const part of cleaned.split(";")) {
    const idx = part.indexOf("=");
    props[part.slice(0, idx).toUpperCase()] = part.slice(idx + 1);
  }

  const rawFreq = extractProp(props, "FREQ").toUpperCase();
  const freq: RruleFreq | "none" =
    RRULE_FREQS.find((candidate) => candidate === rawFreq) ?? "none";

  const interval = props["INTERVAL"] ? parseInt(props["INTERVAL"], 10) : 1;

  const rawByDay = extractProp(props, "BYDAY");
  const byDay: WeekDay[] = rawByDay
    ? rawByDay
        .split(",")
        .map((d) => {
          const stripped = d.replace(/^[+-]?\d+/, "").toUpperCase();
          return WEEKDAYS.find((candidate) => candidate === stripped) ?? null;
        })
        .filter((d): d is WeekDay => d !== null)
    : [];

  const rawBySetPos = extractProp(props, "BYSETPOS");
  const bySetPos = rawBySetPos ? parseInt(rawBySetPos, 10) : 1;

  const rawByMonthDay = extractProp(props, "BYMONTHDAY");
  const byMonthDay = rawByMonthDay ? parseInt(rawByMonthDay, 10) : 1;

  const monthlyMode: MonthlyMode =
    props["BYSETPOS"] !== undefined ? "bysetpos" : "bymonthday";

  const rawCount = extractProp(props, "COUNT");
  const rawUntil = extractProp(props, "UNTIL");

  let endType: RruleEndType = "never";
  let count = 10;
  let until = "";

  if (rawCount) {
    endType = "count";
    count = parseInt(rawCount, 10);
  } else if (rawUntil) {
    endType = "until";
    const y = rawUntil.slice(0, 4);
    const m = rawUntil.slice(4, 6);
    const d = rawUntil.slice(6, 8);
    until = `${y}-${m}-${d}`;
  }

  return { freq, interval, byDay, monthlyMode, byMonthDay, bySetPos, endType, count, until };
}
