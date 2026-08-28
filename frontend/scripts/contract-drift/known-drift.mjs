export const KNOWN_DRIFT = [
  {
    type: "enum",
    method: "POST",
    path: "/timesheets/entries",
    field: "billingType",
    offendingMembers: ["INTERNAL"],
    contractEnum: ["BILLABLE", "NON_BILLABLE", "FIXED"],
    since: "2026-08-28",
    reason: "Frontend type includes INTERNAL but backend Zod schema accepts only BILLABLE, NON_BILLABLE, FIXED; unresolved product decision on which billing-type enum is canonical",
  },
  {
    type: "enum",
    method: "POST",
    path: "/timesheets/entries",
    field: "source",
    offendingMembers: ["GRID"],
    contractEnum: ["MANUAL", "TIMER", "API", "IMPORT"],
    since: "2026-08-28",
    reason: "Frontend type includes GRID but backend Zod schema accepts only MANUAL, TIMER, API, IMPORT; unresolved product decision on which source enum is canonical",
  },
  {
    type: "enum",
    method: "PATCH",
    path: "/timesheets/entries/{entryId}",
    field: "billingType",
    offendingMembers: ["INTERNAL"],
    contractEnum: ["BILLABLE", "NON_BILLABLE", "FIXED"],
    since: "2026-08-28",
    reason: "Frontend type includes INTERNAL but backend Zod schema accepts only BILLABLE, NON_BILLABLE, FIXED; unresolved product decision on which billing-type enum is canonical",
  },
  {
    type: "extra-field",
    method: "POST",
    path: "/timesheets/exceptions/{exceptionId}/resolve",
    field: "reason",
    since: "2026-08-28",
    reason: "Frontend sends a reason field that the backend contract schema does not list in properties; unresolved frontend/backend schema disagreement awaiting a product decision",
  },
  {
    type: "enum",
    method: "POST",
    path: "/timesheets/rates",
    field: "billingType",
    offendingMembers: ["INTERNAL"],
    contractEnum: ["BILLABLE", "NON_BILLABLE", "FIXED"],
    since: "2026-08-28",
    reason: "Frontend type includes INTERNAL but backend Zod schema accepts only BILLABLE, NON_BILLABLE, FIXED; unresolved product decision on which billing-type enum is canonical",
  },
  {
    type: "enum",
    method: "PATCH",
    path: "/timesheets/rates/{rateId}",
    field: "billingType",
    offendingMembers: ["INTERNAL"],
    contractEnum: ["BILLABLE", "NON_BILLABLE", "FIXED"],
    since: "2026-08-28",
    reason: "Frontend type includes INTERNAL but backend Zod schema accepts only BILLABLE, NON_BILLABLE, FIXED; unresolved product decision on which billing-type enum is canonical",
  },
  {
    type: "enum",
    method: "PATCH",
    path: "/timesheets/settings",
    field: "approvalMode",
    offendingMembers: ["NONE", "PROJECT", "CLIENT"],
    contractEnum: ["MANAGER", "AUTO", "MULTI_LEVEL"],
    since: "2026-08-28",
    reason: "Frontend type includes NONE, PROJECT, CLIENT but backend Zod schema accepts only MANAGER, AUTO, MULTI_LEVEL; unresolved product decision on which approval-mode enum is canonical",
  },
];

export function driftKeyForEntry(entry) {
  if (entry.type === "enum") {
    const sorted = [...entry.offendingMembers].sort();
    return `ENUM:${entry.method} ${entry.path}:${entry.field}:[${sorted.join(",")}]`;
  }
  return `EXTRA:${entry.method} ${entry.path}:${entry.field}`;
}

export function extractDriftKeysFromViolation(violation) {
  const keys = new Set();
  const enumPrefix = "enum member drift on ";
  if (violation.startsWith(enumPrefix)) {
    const rest = violation.slice(enumPrefix.length);
    const dashIdx = rest.indexOf(" — ");
    if (dashIdx < 0) return keys;
    const endpointStr = rest.slice(0, dashIdx);
    const entriesPart = rest.slice(dashIdx + 3);
    const spaceIdx = endpointStr.indexOf(" ");
    if (spaceIdx < 0) return keys;
    const method = endpointStr.slice(0, spaceIdx);
    const path = endpointStr.slice(spaceIdx + 1);
    for (const fieldEntry of entriesPart.split("; ")) {
      const colonIdx = fieldEntry.indexOf(":");
      if (colonIdx < 0) continue;
      const fieldName = fieldEntry.slice(0, colonIdx).trim();
      const sendMatch = /frontend can send \[([^\]]*)\]/.exec(fieldEntry);
      if (!sendMatch) continue;
      const members = sendMatch[1].split(", ").map((s) => s.trim()).filter(Boolean).sort();
      keys.add(`ENUM:${method} ${path}:${fieldName}:[${members.join(",")}]`);
    }
    return keys;
  }
  const extraPrefix = "extra body fields on ";
  if (violation.startsWith(extraPrefix)) {
    const rest = violation.slice(extraPrefix.length);
    const suffix = " not in contract schema: ";
    const suffixIdx = rest.indexOf(suffix);
    if (suffixIdx < 0) return keys;
    const endpointStr = rest.slice(0, suffixIdx);
    const fieldsPart = rest.slice(suffixIdx + suffix.length);
    const spaceIdx = endpointStr.indexOf(" ");
    if (spaceIdx < 0) return keys;
    const method = endpointStr.slice(0, spaceIdx);
    const path = endpointStr.slice(spaceIdx + 1);
    for (const field of fieldsPart.split(", ").map((s) => s.trim()).filter(Boolean)) {
      keys.add(`EXTRA:${method} ${path}:${field}`);
    }
    return keys;
  }
  return keys;
}

export function applyBaseline(violations, baseline = KNOWN_DRIFT) {
  const baselineKeyMap = new Map(baseline.map((e) => [driftKeyForEntry(e), e]));
  const seenBaselineKeys = new Set();
  const newViolations = [];
  const baselinedViolations = [];
  for (const violation of violations) {
    const vKeys = extractDriftKeysFromViolation(violation);
    const unbaselined = [];
    for (const k of vKeys) {
      if (baselineKeyMap.has(k)) seenBaselineKeys.add(k);
      else unbaselined.push(k);
    }
    if (vKeys.size === 0 || unbaselined.length > 0) newViolations.push(violation);
    else baselinedViolations.push(violation);
  }
  const staleEntries = baseline.filter((e) => !seenBaselineKeys.has(driftKeyForEntry(e)));
  return { newViolations, baselinedViolations, staleEntries };
}

export function printBaseline(baseline = KNOWN_DRIFT) {
  console.log(`\n=== KNOWN UNFIXED DEFECTS — ${baseline.length} baselined drift(s) tracked; not accepted behaviour; awaiting resolution ===`);
  for (const entry of baseline) {
    const endpoint = `${entry.method} ${entry.path}`;
    if (entry.type === "enum") {
      console.log(`  [since ${entry.since}] ${endpoint} / ${entry.field}`);
      console.log(`    frontend sends: [${entry.offendingMembers.join(", ")}]   contract accepts: [${entry.contractEnum.join(", ")}]`);
    } else {
      console.log(`  [since ${entry.since}] ${endpoint} / ${entry.field} (extra field absent from contract schema)`);
    }
    console.log(`    reason: ${entry.reason}`);
  }
  console.log("===");
}
