import { isRecord } from "@/lib/is-record";

export interface OrgModule {
  moduleKey: string;
  enabled: boolean;
  core?: boolean;
}

function isOrgModule(value: unknown): value is OrgModule {
  if (!isRecord(value)) return false;

  return (
    typeof value.moduleKey === "string" &&
    value.moduleKey.trim().length > 0 &&
    typeof value.enabled === "boolean" &&
    (value.core === undefined || typeof value.core === "boolean")
  );
}

// Insulates the cache from response-envelope differences between API deployments.
export function normalizeOrgModulesResponse(response: unknown): OrgModule[] {
  let candidate = response;

  for (let depth = 0; depth < 3; depth += 1) {
    if (Array.isArray(candidate)) {
      if (candidate.every(isOrgModule)) return candidate;
      break;
    }

    if (!isRecord(candidate)) break;

    if ("data" in candidate) {
      candidate = candidate.data;
      continue;
    }
    if ("modules" in candidate) {
      candidate = candidate.modules;
      continue;
    }
    break;
  }

  throw new Error(
    "The server returned an invalid module configuration. Please try again.",
  );
}
