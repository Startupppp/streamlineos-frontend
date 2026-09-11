export const KNOWN_DRIFT = [];

export function driftKeyForEntry(entry) {
  if (entry.type === "enum") {
    const sorted = [...entry.offendingMembers].sort();
    return `ENUM:${entry.method} ${entry.path}:${entry.field}:[${sorted.join(",")}]`;
  }
  if (entry.type === "query-extra") return `EXTRAQ:${entry.method} ${entry.path}:${entry.field}`;
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
  for (const [prefix, suffix, keyPrefix] of [
    ["extra body fields on ", " not in contract schema: ", "EXTRA"],
    ["extra query params on ", " not in contract parameters: ", "EXTRAQ"],
  ]) {
    if (!violation.startsWith(prefix)) continue;
    const rest = violation.slice(prefix.length);
    const suffixIdx = rest.indexOf(suffix);
    if (suffixIdx < 0) return keys;
    const endpointStr = rest.slice(0, suffixIdx);
    const fieldsPart = rest.slice(suffixIdx + suffix.length);
    const spaceIdx = endpointStr.indexOf(" ");
    if (spaceIdx < 0) return keys;
    const method = endpointStr.slice(0, spaceIdx);
    const path = endpointStr.slice(spaceIdx + 1);
    for (const field of fieldsPart.split(", ").map((s) => s.trim()).filter(Boolean)) {
      keys.add(`${keyPrefix}:${method} ${path}:${field}`);
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
