
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
