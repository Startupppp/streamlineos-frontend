
function toScale4(value: number): number {
  const fixed = value.toFixed(4);
  const negative = fixed.startsWith("-");
  const [whole, fraction] = fixed.replace("-", "").split(".");
  const units = Number(whole) * 10000 + Number(fraction);
  return negative ? -units : units;
}

export function roundInvoiceAmount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const scaled = toScale4(value);
  const negative = scaled < 0;
  const magnitude = negative ? -scaled : scaled;
  const remainder = magnitude % 100;
  const whole = (magnitude - remainder) / 100;
  const paise = remainder * 2 >= 100 ? whole + 1 : whole;
  return (negative ? -paise : paise) / 100;
}
