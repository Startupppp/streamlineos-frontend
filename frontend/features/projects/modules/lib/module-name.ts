const LEADING_EMOJI_PATTERN =
  /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s+(.+)$/u;

export function formatModuleName(icon: string | null | undefined, name: string): string {
  const trimmed = name.trim();
  if (!icon) return trimmed;
  return `${icon} ${trimmed}`;
}

export function parseModuleName(fullName: string): { icon: string | null; name: string } {
  const trimmed = fullName.trim();
  const match = trimmed.match(LEADING_EMOJI_PATTERN);
  if (match?.[1] && match[2]) {
    return { icon: match[1], name: match[2] };
  }
  return { icon: null, name: trimmed };
}

export function getModuleAvatarDisplay(fullName: string): string {
  const { icon } = parseModuleName(fullName);
  if (icon) return icon;

  const trimmed = fullName.trim();
  if (!trimmed) return "MD";
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) {
    return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}
