const MAX_DEPTH = 14;

function isNullable(node, root) {
  const resolved = deref(node, root);
  if (resolved === null || resolved === undefined || typeof resolved !== "object") return false;
  const branches = Array.isArray(resolved.anyOf)
    ? resolved.anyOf
    : Array.isArray(resolved.oneOf)
      ? resolved.oneOf
      : null;
  if (branches !== null) {
    return branches.some((branch) => {
      const b = deref(branch, root);
      return b !== null && typeof b === "object" && b.type === "null";
    });
  }
  if (Array.isArray(resolved.type)) return resolved.type.includes("null");
  return false;
}

function scalarNodes(node, root) {
  return expand(node, root).filter(
    (n) => n.properties === undefined && n.items === undefined && !Array.isArray(n.allOf),
  );
}

function isTypeCompatible(backendType, frontendTypeSet) {
  if (frontendTypeSet.has(backendType)) return true;
  if (backendType === "integer" && frontendTypeSet.has("number")) return true;
  return false;
}

function isUnconstrained(node, root) {
  if (node === undefined || node === null) return true;
  const nodes = expand(node, root);
  if (nodes.length === 0) return true;
  return nodes.every(
    (n) =>
      n.type === undefined &&
      n.properties === undefined &&
      n.items === undefined &&
      n.enum === undefined &&
      n.const === undefined,
  );
}

export function routePattern(route) {
  const withoutQuery = route.split("?")[0] ?? "";
  const collapsed = withoutQuery.replace(/\{[^}]*\}/g, "*");
  if (collapsed.length > 1 && collapsed.endsWith("/")) return collapsed.slice(0, -1);
  return collapsed;
}

function pointer(root, ref) {
  if (typeof ref !== "string" || !ref.startsWith("#/")) return undefined;
  let current = root;
  for (const rawSegment of ref.slice(2).split("/")) {
    const segment = rawSegment.replaceAll("~1", "/").replaceAll("~0", "~");
    if (current === undefined || current === null || typeof current !== "object") return undefined;
    current = current[segment];
  }
  return current;
}

function deref(node, root) {
  let current = node;
  let hops = 0;
  while (
    current !== null &&
    typeof current === "object" &&
    typeof current.$ref === "string" &&
    hops < 8
  ) {
    current = pointer(root, current.$ref);
    hops += 1;
  }
  return current;
}

function mergeAllOf(node, root) {
  const merged = { type: "object", properties: {}, required: [] };
  for (const part of node.allOf ?? [])
    for (const branch of expand(part, root)) {
      Object.assign(merged.properties, branch.properties ?? {});
      merged.required.push(...(branch.required ?? []));
      if (branch.additionalProperties === false) merged.additionalProperties = false;
    }
  Object.assign(merged.properties, node.properties ?? {});
  merged.required.push(...(node.required ?? []));
  if (node.additionalProperties === false) merged.additionalProperties = false;
  return merged;
}

export function expand(node, root, out = []) {
  const resolved = deref(node, root);
  if (resolved === null || resolved === undefined || typeof resolved !== "object") return out;
  const branches = Array.isArray(resolved.anyOf)
    ? resolved.anyOf
    : Array.isArray(resolved.oneOf)
      ? resolved.oneOf
      : null;
  if (branches !== null) {
    for (const branch of branches) expand(branch, root, out);
    return out;
  }
  if (Array.isArray(resolved.allOf)) {
    out.push(mergeAllOf(resolved, root));
    return out;
  }
  if (resolved.type === "null") return out;
  out.push(resolved);
  return out;
}

function objectsOf(nodes) {
  return nodes.filter(
    (node) => node.properties !== undefined && node.properties !== null && typeof node.properties === "object",
  );
}

function childPath(path, name) {
  return path === "" ? name : `${path}.${name}`;
}

export function diffSchemas(frontend, backend, frontendRoot, backendRoot) {
  const missing = [];
  const extras = [];
  const optionalOnBackend = [];
  const opaque = [];
  const typeMismatches = [];
  let comparedObjects = 0;
  let comparedFields = 0;
  const visited = new Set();

  const walk = (frontendNode, backendNode, path, depth) => {
    if (depth > MAX_DEPTH) return;
    const key = `${path}|${depth}`;
    if (visited.has(key)) return;
    visited.add(key);

    const frontendNodes = expand(frontendNode, frontendRoot);
    const backendNodes = expand(backendNode, backendRoot);
    if (frontendNodes.length === 0 || backendNodes.length === 0) return;

    const frontendObjects = objectsOf(frontendNodes);
    const backendObjects = objectsOf(backendNodes);

    if (frontendObjects.length > 0 && backendObjects.length === 0) opaque.push(path === "" ? "(root)" : path);

    if (frontendObjects.length > 0 && backendObjects.length > 0) {
      comparedObjects += 1;
      for (const frontendObject of frontendObjects) {
        for (const field of frontendObject.required ?? []) {
          const frontendFieldSchema = frontendObject.properties?.[field];
          if (frontendFieldSchema !== undefined && isUnconstrained(frontendFieldSchema, frontendRoot)) continue;
          comparedFields += 1;
          const declaring = backendObjects.filter((node) =>
            Object.prototype.hasOwnProperty.call(node.properties, field),
          );
          if (declaring.length === 0) missing.push({ path: childPath(path, field), field });
          else if (!declaring.some((node) => (node.required ?? []).includes(field)))
            optionalOnBackend.push({ path: childPath(path, field), field });
        }
        if (frontendObject.additionalProperties === false)
          for (const backendObject of backendObjects)
            for (const name of Object.keys(backendObject.properties))
              if (!Object.prototype.hasOwnProperty.call(frontendObject.properties, name))
                extras.push({ path: childPath(path, name), field: name });
        for (const [name, frontendChild] of Object.entries(frontendObject.properties)) {
          const backendChild = backendObjects
            .map((node) => node.properties[name])
            .find((value) => value !== undefined);
          if (backendChild !== undefined) {
            const fp = childPath(path, name);
            const frontendScalars = scalarNodes(frontendChild, frontendRoot);
            const backendScalars = scalarNodes(backendChild, backendRoot);
            if (frontendScalars.length > 0 && backendScalars.length > 0) {
              const fTypes = new Set(frontendScalars.map((n) => n.type).filter(Boolean));
              const bTypes = backendScalars.map((n) => n.type).filter(Boolean);
              if (fTypes.size > 0 && bTypes.length > 0) {
                const incompatible = bTypes.filter((bt) => !isTypeCompatible(bt, fTypes));
                if (incompatible.length > 0)
                  typeMismatches.push({ path: fp, field: name, kind: "type", backendType: incompatible[0], frontendTypes: [...fTypes] });
              }
              const fEnumSet = new Set(frontendScalars.flatMap((n) => n.enum ?? []));
              const bEnums = backendScalars.flatMap((n) => n.enum ?? []);
              if (fEnumSet.size > 0 && bEnums.length > 0) {
                const unexpectedValues = [...new Set(bEnums)].filter((v) => !fEnumSet.has(v));
                if (unexpectedValues.length > 0)
                  typeMismatches.push({ path: fp, field: name, kind: "enum", unexpectedValues });
              }
            }
            const frontendNullable = isNullable(frontendChild, frontendRoot);
            const backendNullable = isNullable(backendChild, backendRoot);
            if (backendNullable && !frontendNullable)
              typeMismatches.push({ path: fp, field: name, kind: "nullable" });
            walk(frontendChild, backendChild, fp, depth + 1);
          }
        }
      }
    }

    const frontendArray = frontendNodes.find((node) => node.items !== undefined);
    const backendArray = backendNodes.find((node) => node.items !== undefined);
    if (frontendArray !== undefined && backendArray !== undefined)
      walk(frontendArray.items, backendArray.items, `${path}[]`, depth + 1);

    const frontendRecord = frontendNodes.find(
      (node) => node.additionalProperties !== undefined && typeof node.additionalProperties === "object",
    );
    const backendRecord = backendNodes.find(
      (node) => node.additionalProperties !== undefined && typeof node.additionalProperties === "object",
    );
    if (frontendRecord !== undefined && backendRecord !== undefined)
      walk(
        frontendRecord.additionalProperties,
        backendRecord.additionalProperties,
        `${path}{}`,
        depth + 1,
      );
  };

  walk(frontend, backend, "", 0);

  const unique = (entries) => {
    const seen = new Set();
    return entries.filter((entry) => {
      if (seen.has(entry.path)) return false;
      seen.add(entry.path);
      return true;
    });
  };

  const uniqueByPathAndKind = (entries) => {
    const seen = new Set();
    return entries.filter((entry) => {
      const key = `${entry.path}|${entry.kind}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  return {
    missing: unique(missing),
    extras: unique(extras),
    optionalOnBackend: unique(optionalOnBackend),
    opaque: [...new Set(opaque)],
    typeMismatches: uniqueByPathAndKind(typeMismatches),
    comparedObjects,
    comparedFields,
  };
}

export function responseBodySchema(operation) {
  const responses = operation?.responses;
  if (responses === undefined || responses === null) return null;
  for (const code of ["200", "201"]) {
    const schema = responses[code]?.content?.["application/json"]?.schema;
    if (schema !== undefined && schema !== null) return schema;
  }
  return null;
}

export function unwrapSuccessEnvelope(schema, root) {
  for (const node of expand(schema, root)) {
    const properties = node.properties;
    if (
      properties !== undefined &&
      properties !== null &&
      typeof properties === "object" &&
      properties.success !== undefined &&
      properties.data !== undefined
    )
      return properties.data;
  }
  return schema;
}

export function indexOperations(document) {
  const index = new Map();
  for (const [path, item] of Object.entries(document?.paths ?? {})) {
    if (item === null || typeof item !== "object") continue;
    for (const [method, operation] of Object.entries(item)) {
      if (operation === null || typeof operation !== "object") continue;
      index.set(`${method.toLowerCase()} ${routePattern(path)}`, { path, method, operation });
    }
  }
  return index;
}
