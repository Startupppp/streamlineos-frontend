export interface NamedUser {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

/**
 * Runs of whitespace, including the ones a paste from a document brings with it:
 * non-breaking space, the zero-width family, and the byte-order mark.
 */
const WHITESPACE_RUN = /(?:\s|\u00a0|\u200b|\u200c|\u200d|\u2060|\ufeff)+/gu;

/**
 * Ticket 07. Whitespace is the only thing normalised about a name. Letters, case
 * and punctuation are left exactly as the person wrote them — "QA", "McDonald",
 * "van der Berg", "O'Brien" and "de Souza-Silva" are all legal names.
 */
export function normalizeNamePart(value: string | null | undefined): string {
  return (value ?? "").replace(WHITESPACE_RUN, " ").trim();
}

/**
 * Ticket 07. One precedence for every surface, matching the backend's
 * `resolvePersonDisplayName`: the name the person chose, then the directory's
 * first and last name, then whichever single given part exists, then the address.
 *
 * The directory card and the directory table each composed this themselves and
 * preferred first+last, while the profile header and this helper preferred the
 * chosen name (V-023/V-025) — so the same person could read one way on a card
 * and another in the header, the CSV and the profile PDF.
 */
export function getUserDisplayName(user: NamedUser | null | undefined): string {
  if (!user) return "Unassigned";
  const accountName = normalizeNamePart(user.name);
  if (accountName) return accountName;

  const first = normalizeNamePart(user.firstName);
  const last = normalizeNamePart(user.lastName);
  if (first && last) return `${first} ${last}`;
  if (first || last) return first || last;

  const email = normalizeNamePart(user.email);
  if (!email) return "Unknown";
  const local = normalizeNamePart(email.split("@")[0]);
  return local || email;
}

export function getUserInitials(user: NamedUser | null | undefined): string {
  if (!user) return "?";
  const first = normalizeNamePart(user.firstName)[0] ?? "";
  const last = normalizeNamePart(user.lastName)[0] ?? "";
  if (first || last) return `${first}${last}`.toUpperCase();
  const parts = getUserDisplayName(user).split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (`${a}${b}`.trim() || "?").toUpperCase();
}
