const PRODUCT_RETURN_PATHNAME =
  /^\/build\/managed-products(\/[1-9]\d*(\/(feedback|goals|insights|projects|releases|roadmap|settings))?)?$/;

const PRODUCT_RETURN_MAX_LENGTH = 1024;

const PRODUCT_RETURN_QUERY_KEYS = [
  "archived",
  "assigneeId",
  "confidenceMin",
  "consentStatus",
  "crmOrganizationId",
  "cursor",
  "cursors",
  "customerVisible",
  "due",
  "duplicate",
  "evidenceState",
  "from",
  "goalId",
  "health",
  "horizon",
  "initiativeStatus",
  "item",
  "level",
  "lifecycle",
  "linked",
  "linkedProjectId",
  "linkedToOpportunity",
  "memberCursors",
  "oppConfidence",
  "oppEvidenceAge",
  "oppOwner",
  "oppScoreMax",
  "oppScoreMin",
  "oppSegment",
  "oppSort",
  "oppState",
  "oppTheme",
  "oppThemePeriod",
  "opportunity",
  "ownerId",
  "page",
  "period",
  "projectCursors",
  "range",
  "scope",
  "search",
  "segment",
  "sentiment",
  "sort",
  "sourceChannel",
  "status",
  "submission",
  "tab",
  "tag",
  "targetFrom",
  "targetTo",
  "teamId",
  "theme",
  "ticket",
  "ticketProject",
  "to",
  "type",
  "view",
  "widgetCursors",
] as const;

export const PRODUCT_RETURN_PARAM = "ret";

export function resolveProductReturnHref(
  returnTo: string | null | undefined,
): string | null {
  if (
    !returnTo ||
    returnTo.length > PRODUCT_RETURN_MAX_LENGTH ||
    !returnTo.startsWith("/") ||
    returnTo.startsWith("//") ||
    returnTo.includes("\\")
  ) {
    return null;
  }

  const origin = "https://streamline.invalid";
  let candidate: URL;
  try {
    candidate = new URL(returnTo, origin);
  } catch {
    return null;
  }

  if (
    candidate.origin !== origin ||
    candidate.hash ||
    !PRODUCT_RETURN_PATHNAME.test(candidate.pathname)
  ) {
    return null;
  }

  for (const key of candidate.searchParams.keys()) {
    if (!PRODUCT_RETURN_QUERY_KEYS.some((allowed) => allowed === key)) {
      return null;
    }
  }

  return `${candidate.pathname}${candidate.search}`;
}

export function buildProductReturnParam(
  pathname: string,
  search: string,
): string {
  return encodeURIComponent(`${pathname}${search ? `?${search}` : ""}`);
}

