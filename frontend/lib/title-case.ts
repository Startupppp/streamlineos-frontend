/**
 * Title-case a short human label — a shift template name, a job designation.
 *
 * A word that already carries a capital is returned verbatim. That single rule
 * covers an initialism (`IST`), an internal capital (`McDonald`, `iOS`) and a
 * label the author already capitalised, so no acronym allow-list is needed and
 * none can go stale. Only an all-lowercase word is touched.
 *
 * Deliberately NOT for a person's name. HRMS-E2E-027 settled that names are
 * passed through verbatim end to end; `dto/employee-name-verbatim.spec.ts` in
 * the backend pins it.
 */
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
