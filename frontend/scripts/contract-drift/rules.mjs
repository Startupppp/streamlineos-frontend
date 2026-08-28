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
  if (!call.bodyFields) return null;
  const contractPath = findContractPath(contract, call.path);
  if (!contractPath) return null;
  const schema = getContractSchema(contract, contractPath, call.method);
  if (!schema?.properties) return null;
  const allowed = new Set(Object.keys(schema.properties));
  const extra = [...call.bodyFields].filter((f) => !allowed.has(f));
  if (extra.length === 0) return null;
  return `extra body fields on ${call.method} ${call.path} not in contract schema: ${extra.join(", ")}`;
}

export function checkMissingRequiredFields(call, contract) {
  if (call.isPartial || !call.bodyFields) return null;
  const contractPath = findContractPath(contract, call.path);
  if (!contractPath) return null;
  const schema = getContractSchema(contract, contractPath, call.method);
  if (!schema?.required) return null;
  const missing = schema.required.filter((f) => !call.bodyFields.has(f));
  if (missing.length === 0) return null;
  return `missing required fields on ${call.method} ${call.path}: ${missing.join(", ")} (contract marks them required)`;
}

export function checkEnumDrift(call, contract, interfaceFieldTypeMap, typeAliasEnumMap) {
  if (!call.bodyFields || !call.bodyTypeName) return { violation: null, narrowing: null };
  const contractPath = findContractPath(contract, call.path);
  if (!contractPath) return { violation: null, narrowing: null };
  const schema = getContractSchema(contract, contractPath, call.method);
  if (!schema?.properties) return { violation: null, narrowing: null };

  const fieldTypeMap = interfaceFieldTypeMap.get(call.bodyTypeName);
  if (!fieldTypeMap) return { violation: null, narrowing: null };

  const extraEntries = [];
  const narrowingEntries = [];

  for (const fieldName of call.bodyFields) {
    const contractProp = schema.properties[fieldName];
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

export function checkResolutionFloor(calls, minFraction, minCalls) {
  if (calls.length < minCalls) {
    return `scan floor violated: only ${calls.length} timesheets call(s) found, below the minimum ${minCalls} — the hook directories have moved or the extractor is broken, so a clean result here would mean nothing`;
  }
  const resolved = calls.filter((c) => c.bodyFields !== null).length;
  const fraction = resolved / calls.length;
  if (fraction < minFraction) {
    return `body-resolution floor violated: ${resolved}/${calls.length} resolved (${Math.round(fraction * 100)}%) is below the minimum ${Math.round(minFraction * 100)}% — a refactor may have broken the body-type extractor`;
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
