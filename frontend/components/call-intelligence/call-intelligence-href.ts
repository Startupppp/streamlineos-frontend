export function callIntelligenceHref(activityId: string | number): string {
  return `/crm/intelligence/${activityId}`;
}

export const CALL_INTELLIGENCE_ROUTE = "app/(authenticated)/crm/intelligence/[activityId]";
