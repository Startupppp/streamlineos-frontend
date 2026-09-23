const MAX_DEPTH = 14;

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
          if (backendChild !== undefined) walk(frontendChild, backendChild, childPath(path, name), depth + 1);
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

  return {
    missing: unique(missing),
    extras: unique(extras),
    optionalOnBackend: unique(optionalOnBackend),
    opaque: [...new Set(opaque)],
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
