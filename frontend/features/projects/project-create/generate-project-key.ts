export function generateProjectKey(name: string): string {
  const words = name
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter((word) => word.length > 0);

  if (words.length >= 2) {
    const initials = words
      .map((word) => word[0] ?? "")
      .join("")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 4);
    if (initials.length >= 2) {
      return initials;
    }
  }

  return name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().substring(0, 4);
}
