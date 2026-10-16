export function currentAnalyticsMonth(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error("Calendar analytics timezone could not be resolved");
  return `${year}-${month}`;
}

export function analyticsMonthWindow(month: string): { from: string; to: string } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid analytics month");
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber, 1));
  return { from: `${month}-01`, to: next.toISOString().slice(0, 10) };
}

export function availableAnalyticsMonths(currentMonth: string, retentionDays: number): { value: string; label: string }[] {
  const { from } = analyticsMonthWindow(currentMonth);
  const start = new Date(`${from}T00:00:00.000Z`);
  const count = Math.ceil(retentionDays / 28) + 1;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - index, 1));
    return {
      value: date.toISOString().slice(0, 7),
      label: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(date),
    };
  });
}

function monthStartInTimeZone(month: string, timeZone: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  const target = Date.UTC(year, monthNumber - 1, 1);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let instant = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(new Date(instant));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const displayed = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
    instant += target - displayed;
  }
  return instant;
}

export function defaultAnalyticsMonth(timeZone: string, retentionDays: number, now = new Date()): string {
  const currentMonth = currentAnalyticsMonth(timeZone, now);
  const dayMs = 24 * 60 * 60_000;
  return availableAnalyticsMonths(currentMonth, retentionDays).find(({ value }) => {
    const { to } = analyticsMonthWindow(value);
    return monthStartInTimeZone(to.slice(0, 7), timeZone) + 7 * dayMs <= now.getTime()
      && monthStartInTimeZone(value, timeZone) + retentionDays * dayMs >= now.getTime();
  })?.value ?? currentMonth;
}
