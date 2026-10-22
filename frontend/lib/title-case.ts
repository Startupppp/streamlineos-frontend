export function titleCaseLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map(titleCaseWord)
    .join(" ");
}

function titleCaseWord(word: string): string {
  if (/\p{Lu}/u.test(word)) return word;
  return word
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
}
