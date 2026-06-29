const PASSWORD_RULES = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  specialChars: "@$!%*?&#^_+=\\-",
} as const;

export const PASSWORD_REGEX = new RegExp(
  `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[${PASSWORD_RULES.specialChars.replace(/[-\\]/g, "\\$&")}])[A-Za-z\\d${PASSWORD_RULES.specialChars.replace(/[-\\]/g, "\\$&")}]{${PASSWORD_RULES.minLength},${PASSWORD_RULES.maxLength}}$`,
);

export function getPasswordStrength(password: string) {
  const checks = {
    length: password.length >= PASSWORD_RULES.minLength,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: new RegExp(`[${PASSWORD_RULES.specialChars.replace(/[-\\]/g, "\\$&")}]`).test(password),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  let level: "weak" | "fair" | "good" | "strong" = "weak";
  let color = "bg-red-500";
  if (passed >= 5) { level = "strong"; color = "bg-green-500"; }
  else if (passed >= 4) { level = "good"; color = "bg-blue-500"; }
  else if (passed >= 3) { level = "fair"; color = "bg-yellow-500"; }
  return { checks, passed, level, color, percentage: (passed / 5) * 100 };
}

export type PasswordStrength = ReturnType<typeof getPasswordStrength>;

export const PASSWORD_REQUIREMENTS = [
  { key: "length" as const, label: `${PASSWORD_RULES.minLength}+ characters` },
  { key: "uppercase" as const, label: "Uppercase" },
  { key: "lowercase" as const, label: "Lowercase" },
  { key: "number" as const, label: "Number" },
  { key: "special" as const, label: "Special char" },
] as const;

export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  missing: string[];
} {
  const specialRe = new RegExp(`[${PASSWORD_RULES.specialChars.replace(/[-\\]/g, "\\$&")}]`);
  const missing: string[] = [];

  if (password.length < PASSWORD_RULES.minLength) missing.push(`At least ${PASSWORD_RULES.minLength} characters`);
  if (password.length > PASSWORD_RULES.maxLength) missing.push(`No more than ${PASSWORD_RULES.maxLength} characters`);
  if (!/[A-Z]/.test(password)) missing.push("At least one uppercase letter");
  if (!/[a-z]/.test(password)) missing.push("At least one lowercase letter");
  if (!/\d/.test(password)) missing.push("At least one number");
  if (!specialRe.test(password)) missing.push(`At least one special character (${PASSWORD_RULES.specialChars})`);

  const checks = 5;
  const passed = checks - Math.min(missing.length, checks);
  return { valid: missing.length === 0, score: Math.round((passed / checks) * 100), missing };
}
