/**
 * CRM-P1-18. The address of one call's analysis.
 *
 * A named function rather than a template literal at each call site, because
 * the thing that breaks a deep link is the link and the route disagreeing —
 * and a string built inline in a timeline row cannot be checked against the
 * `app/` folder that answers it. `call-intelligence-href.test.ts` holds the two
 * together.
 */
export function callIntelligenceHref(activityId: string | number): string {
  return `/crm/intelligence/${activityId}`;
}

/** The route segment this href resolves to, as it is spelled on disk. */
export const CALL_INTELLIGENCE_ROUTE = "app/(authenticated)/crm/intelligence/[activityId]";
