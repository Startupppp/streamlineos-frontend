import * as fs from "fs";


const HTTP_VERBS = ["get", "post", "patch", "delete", "put"] as const;

export interface ApiClientCall {
  readonly verb: string;
  readonly path: string;
}

function apiClientCalls(file: string): ApiClientCall[] {
  const source = fs.readFileSync(file, "utf8");
  const calls: ApiClientCall[] = [];
  const pattern = new RegExp(
    `apiClient\\.(${HTTP_VERBS.join("|")})(?:<[^>]*>)?\\(\\s*["\`]([^"\`]+)["\`]`,
    "g",
  );
  for (const match of source.matchAll(pattern)) {
    const verb = match[1];
    const path = match[2];
    if (verb === undefined || path === undefined) continue;
    calls.push({
      verb: verb.toUpperCase(),
      path: path.replace(/\$\{[^}]*\}/g, ":param"),
    });
  }
  return calls;
}

export function declaredRoutes(files: readonly string[]): Set<string> {
  const routes = new Set<string>();
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const controller = /@Controller\(\s*"([^"]*)"\s*\)/.exec(source)?.[1];
    if (controller === undefined)
      throw new Error(`no @Controller prefix found in ${file}`);
    for (const match of source.matchAll(
      /@(Get|Post|Patch|Delete|Put)\(\s*(?:"([^"]*)")?\s*\)/g,
    )) {
      const verb = match[1];
      if (verb === undefined) continue;
      const segment = match[2] ?? "";
      const joined = [controller, segment].filter((s) => s.length > 0).join("/");
      routes.add(
        `${verb.toUpperCase()} /${joined.replace(/:[A-Za-z0-9_]+/g, ":param")}`,
      );
    }
  }
  return routes;
}

export function unresolvedCalls(
  hookFile: string,
  controllerFiles: readonly string[],
): { calls: ApiClientCall[]; routes: Set<string>; unresolved: string[] } {
  const calls = apiClientCalls(hookFile);
  const routes = declaredRoutes(controllerFiles);
  const unresolved = calls
    .map((call) => `${call.verb} ${call.path}`)
    .filter((signature) => !routes.has(signature));
  return { calls, routes, unresolved };
}
