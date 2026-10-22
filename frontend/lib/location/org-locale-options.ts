import { getAllCountries, getCountry } from "countries-and-timezones";

export const COUNTRY_OPTIONS = Object.values(getAllCountries())
  .map((country) => ({ value: country.id, label: country.name }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const DEFAULT_ORG_COUNTRY = "IN";
export const DEFAULT_ORG_TIMEZONE = "Asia/Kolkata";

export function timezonesForCountry(countryCode: string): string[] {
  const zones = getCountry(countryCode)?.timezones ?? [];
  return zones.length > 0 ? [...zones] : [DEFAULT_ORG_TIMEZONE];
}
