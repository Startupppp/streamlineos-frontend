
const REPEATED_DIGIT = /^(\d)\1+$/;

export function nationalDigitsOf(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function isImplausiblePhone(value: string | null | undefined): boolean {
  if (!value) return false;
  const digits = nationalDigitsOf(value);
  if (digits.length < 6) return false;
  return REPEATED_DIGIT.test(digits);
}
