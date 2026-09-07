function pathToTemplate(p) {
  return p.replace(/\{[^}]+\}/gu, "{X}");
}

function getContractPaths(contract) {
  return new Set(Object.keys(contract.paths ?? {}));
}

function findContractPath(contract, frontendPath) {
  const contractPaths = getContractPaths(contract);
  if (contractPaths.has(frontendPath)) return frontendPath;
  const frontendTemplate = pathToTemplate(frontendPath);
  for (const cp of contractPaths) {
    if (pathToTemplate(cp) === frontendTemplate) return cp;
  }
  return null;
}

function getContractSchema(contract, path, method) {
  const pathItem = contract.paths?.[path];
  if (!pathItem) return null;
  const op = pathItem[method.toLowerCase()];
  if (!op) return null;
  return op.requestBody?.content?.["application/json"]?.schema ?? null;
}

/**
 * One shape for both halves of a request contract: a write's JSON body schema
 * and a read's declared query parameters. Flattening `parameters` into the same
 * `{ properties, required }` form is what lets the extra-field, missing-required
 * and enum rules cover a GET's query string instead of skipping it.
 */
function getContractRequestShape(contract, path, method, kind) {
  if (kind === "query") {
    const pathItem = contract.paths?.[path];
    const op = pathItem?.[method.toLowerCase()];
    if (!op) return null;
    const declared = [...(pathItem.parameters ?? []), ...(op.parameters ?? [])].filter((p) => p.in === "query");
    const properties = {};
    const required = [];
    for (const p of declared) {
      properties[p.name] = p.schema ?? {};
      if (p.required) required.push(p.name);
    }
    return { properties, required, label: "query params", preposition: "not in contract parameters" };
  }
  const schema = getContractSchema(contract, path, method);
  const properties = schema?.properties ?? {};
  const required = schema?.required ?? [];
  return { properties, required, label: "body fields", preposition: "not in contract schema" };
}

export function checkMissingPath(call, contract) {
  const match = findContractPath(contract, call.path);
  if (!match) return `path not in contract: ${call.method} ${call.path}`;
  return null;
}

export function checkMethodMismatch(call, contract) {
  const contractPath = findContractPath(contract, call.path);
  if (!contractPath) return null;
  const pathItem = contract.paths[contractPath];
  if (!pathItem[call.method.toLowerCase()]) {
    const available = Object.keys(pathItem)
      .filter((k) => k !== "parameters")
      .map((k) => k.toUpperCase())
      .join(", ");
    return `method mismatch: frontend uses ${call.method} ${call.path}, contract has [${available}]`;
  }
  return null;
}

export function checkExtraBodyFields(call, contract) {
  if (!call.requestFields) return null;
  const contractPath = findContractPath(contract, call.path);
  if (!contractPath) return null;
  const shape = getContractRequestShape(contract, contractPath, call.method, call.requestKind);
  if (!shape) return null;
  const allowed = new Set(Object.keys(shape.properties));
  const extra = [...call.requestFields].filter((f) => !allowed.has(f));
  if (extra.length === 0) return null;
  return `extra ${shape.label} on ${call.method} ${call.path} ${shape.preposition}: ${extra.join(", ")}`;
}

export function checkMissingRequiredFields(call, contract) {
  if (call.isPartial || !call.requestFields) return null;
  const contractPath = findContractPath(contract, call.path);
  if (!contractPath) return null;
  const shape = getContractRequestShape(contract, contractPath, call.method, call.requestKind);
  if (!shape) return null;
  const missing = shape.required.filter((f) => !call.requestFields.has(f));
  if (missing.length === 0) return null;
  return `missing required ${shape.label} on ${call.method} ${call.path}: ${missing.join(", ")} (contract marks them required)`;
}

export function checkEnumDrift(call, contract, interfaceFieldTypeMap, typeAliasEnumMap) {
  if (!call.requestFields || !call.requestTypeName) return { violation: null, narrowing: null };
  const contractPath = findContractPath(contract, call.path);
  if (!contractPath) return { violation: null, narrowing: null };
  const shape = getContractRequestShape(contract, contractPath, call.method, call.requestKind);
  if (!shape) return { violation: null, narrowing: null };

  const fieldTypeMap = interfaceFieldTypeMap.get(call.requestTypeName);
  if (!fieldTypeMap) return { violation: null, narrowing: null };

  const extraEntries = [];
  const narrowingEntries = [];

  for (const fieldName of call.requestFields) {
    const contractProp = shape.properties[fieldName];
    if (!Array.isArray(contractProp?.enum)) continue;
    const contractSet = new Set(contractProp.enum);

    const typeName = fieldTypeMap.get(fieldName);
    if (!typeName) continue;

    const frontendMembers = typeAliasEnumMap.get(typeName);
    if (!frontendMembers) continue;

    const extra = frontendMembers.filter((v) => !contractSet.has(v));
    if (extra.length > 0) {
      extraEntries.push(
        `${fieldName}: frontend can send [${extra.join(", ")}] but contract enum is [${contractProp.enum.join(", ")}]`,
      );
    }

    const missing = [...contractSet].filter((v) => !frontendMembers.includes(v));
    if (missing.length > 0) {
      narrowingEntries.push(
        `${fieldName}: contract allows [${missing.join(", ")}] but frontend type omits them`,
      );
    }
  }

  const violation =
    extraEntries.length > 0
      ? `enum member drift on ${call.method} ${call.path} — ${extraEntries.join("; ")}`
      : null;
  const narrowing =
    narrowingEntries.length > 0
      ? `narrowing on ${call.method} ${call.path} — ${narrowingEntries.join("; ")}`
      : null;

  return { violation, narrowing };
}

/**
 * A path segment built from a variable is a path the scan cannot match against
 * the contract, so it is dropped — and a dropped call is a call whose drift can
 * never be reported. Counting it without failing is how the two that existed
 * stayed invisible; give each action its own literal path instead.
 */
export function checkSkippedComputedPaths(skipped) {
  if (skipped === 0) return null;
  return `${skipped} call(s) skipped for a computed path segment — a path interpolated from a variable cannot be matched to the contract, so drift inside those calls is unreportable. Give each action its own literal path (\`/timesheets/timer/\${timerId}/pause\`), never \`\${action}\``;
}

export function checkResolutionFloor(calls, minFraction, minCalls) {
  if (calls.length < minCalls) {
    return `scan floor violated: only ${calls.length} timesheets call(s) found, below the minimum ${minCalls} — the hook directories have moved or the extractor is broken, so a clean result here would mean nothing`;
  }
  const resolved = calls.filter((c) => c.requestFields !== null).length;
  const fraction = resolved / calls.length;
  if (fraction < minFraction) {
    return `request-resolution floor violated: ${resolved}/${calls.length} resolved (${Math.round(fraction * 100)}%) is below the minimum ${Math.round(minFraction * 100)}%. Either the request-shape extractor broke, or a new call passes a payload the scan cannot read — annotate it with a named interface (\`const params: EntriesQueryParams = …\`) or pass a literal object; a \`Record<string, unknown>\`, a spread or an unannotated identifier is unreadable`;
  }
  return null;
}

export function runChecks(calls, contract, interfaceFieldTypeMap, typeAliasEnumMap) {
  const violations = [];
  const narrowings = [];
  for (const call of calls) {
    const v1 = checkMissingPath(call, contract);
    if (v1) { violations.push(v1); continue; }
    const v2 = checkMethodMismatch(call, contract);
    if (v2) violations.push(v2);
    const v3 = checkExtraBodyFields(call, contract);
    if (v3) violations.push(v3);
    const v4 = checkMissingRequiredFields(call, contract);
    if (v4) violations.push(v4);
    const { violation: v5, narrowing: n5 } = checkEnumDrift(
      call,
      contract,
      interfaceFieldTypeMap,
      typeAliasEnumMap,
    );
    if (v5) violations.push(v5);
    if (n5) narrowings.push(n5);
  }
  return { violations, narrowings };
}
