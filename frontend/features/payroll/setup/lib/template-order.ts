type TemplateOrderFields = {
  key: string | null;
  name: string;
  isRecommended?: boolean;
};

const COUNTRY_MARKERS: Record<string, readonly string[]> = {
  IN: ["INDIAN", "INDIA", "IN_"],
  AU: ["AUSTRALIA", "AUSTRALIAN", "AU_", "AU "],
  US: ["UNITED STATES", "USA", "US_", "US "],
  GB: ["UNITED KINGDOM", "UK_", "GB_", "UK "],
  AE: ["UAE", "AE_"],
  SG: ["SINGAPORE", "SG_"],
};

export function templateMatchesCountry(
  template: Pick<TemplateOrderFields, "key" | "name">,
  country: string,
): boolean {
  const code = country.trim().toUpperCase();
  if (!code) return false;
  const markers = COUNTRY_MARKERS[code] ?? [code];
  const haystack = `${template.key ?? ""} ${template.name}`.toUpperCase();
  return markers.some((marker) => haystack.includes(marker));
}

/** Country matches first, then recommended, preserving the original order otherwise. */
export function orderTemplatesForCountry<T extends TemplateOrderFields>(
  templates: readonly T[],
  country: string | undefined,
): T[] {
  return templates
    .map((template, index) => ({
      template,
      index,
      match: country ? templateMatchesCountry(template, country) : false,
    }))
    .sort((left, right) => {
      if (left.match !== right.match) return left.match ? -1 : 1;
      const leftRecommended = left.template.isRecommended === true;
      const rightRecommended = right.template.isRecommended === true;
      if (leftRecommended !== rightRecommended) return leftRecommended ? -1 : 1;
      return left.index - right.index;
    })
    .map((row) => row.template);
}
