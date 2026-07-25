export const isWeekend = (d: Date): boolean =>
  d.getDay() === 0 || d.getDay() === 6;

export function countWorkdays(startStr: string, endStr: string): number {
  const end = new Date(`${endStr}T00:00:00`);
  const current = new Date(`${startStr}T00:00:00`);
  let count = 0;
  while (current <= end) {
    if (!isWeekend(current)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}
