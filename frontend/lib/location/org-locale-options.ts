import { getAllCountries, getCountry } from "countries-and-timezones";

/**
 * BUG-HRMS-009. Organization create collected a name and a billing email, so
 * every org started on the column defaults — `Asia/Kolkata` and a null country —
 * correct by luck for the India-first case and invisible until a payroll cut-off
 * or a statutory field needed the real ones.
 *
 * The list comes from `countries-and-timezones`, already a dependency, rather
 * than a hand-kept table that would drift from the IANA zones the backend
 * validates against.
 */
export const COUNTRY_OPTIONS = Object.values(getAllCountries())
  .map((country) => ({ value: country.id, label: country.name }))
  .sort((a, b) => a.label.localeCompare(b.label));

/** The product is India-first; both defaults match the columns' own defaults. */
export const DEFAULT_ORG_COUNTRY = "IN";
export const DEFAULT_ORG_TIMEZONE = "Asia/Kolkata";

/**
 * The zones the chosen country actually uses, so picking India cannot leave the
 * form on `America/New_York`. Falls back to the default zone for a country the
 * table does not know, because the field must never become unselectable.
 */
export function timezonesForCountry(countryCode: string): string[] {
  const zones = getCountry(countryCode)?.timezones ?? [];
  return zones.length > 0 ? [...zones] : [DEFAULT_ORG_TIMEZONE];
}
