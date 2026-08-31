/**
 * Where a reference points, as a route.
 *
 * `FieldSpec.referenceTo` names the domain a pointer aims at, and until now that
 * only reached the form — a surface supplied a picker and the rendered value
 * stayed an identifier. So a quote's deal and its client had to be a
 * hand-written card beside the generated detail view, because describing them
 * would have silently cost the navigation.
 *
 * One map, here, rather than a resolver passed down by each screen. A route is
 * app knowledge, but it is knowledge the *app* holds once, not knowledge a
 * screen holds about the records it happens to embed — the alternative is that
 * every detail view carries its own idea of where a deal lives, and they drift
 * the first time a route moves.
 *
 * A domain with no entry renders as plain text rather than as a link to
 * nowhere. A new record type reaches the engine as a description; it reaches
 * this map when somebody has actually built a page to send people to.
 */

type RouteFor = (id: string) => string;

const REFERENCE_ROUTES: Readonly<Record<string, RouteFor>> = {
  lead: (id) => `/crm/leads/${id}`,
  deal: (id) => `/crm/deals/${id}`,
  quote: (id) => `/crm/quotes/${id}`,
  contact: (id) => `/crm/contacts/${id}`,
  company: (id) => `/crm/companies/${id}`,
  client: (id) => `/crm/clients/${id}`,
  campaign: (id) => `/crm/campaigns/${id}`,
  party: (id) => `/party/parties/${id}`,
  subject: (id) => `/party/subjects/${id}`,
};

export function referenceHref(domain: string | undefined, id: string): string | undefined {
  if (!domain || !id.trim()) return undefined;
  return REFERENCE_ROUTES[domain]?.(encodeURIComponent(id.trim()));
}
