import * as fs from "fs";

/**
 * The two halves of "does this hook call a route that exists".
 *
 * Two release defects had the same shape and neither was caught by anything:
 * `useAdminBlogCategories` called `GET /blog/admin/categories` and
 * `useBankAccount` called `GET /finance/bank-accounts/{id}`, and neither route
 * was ever declared. A hook that calls a route nobody wrote compiles, type-checks
 * and passes its component tests — the component test mocks the hook — and fails
 * only in a browser, as a 404 rendered as an ErrorState with a Retry button that
 * can never succeed.
 *
 * The oracle is the CONTROLLER SOURCE, not `contracts/openapi.json`: that file is
 * regenerated at quiesce and drifts in between, so it both misses real routes and
 * lists ones that no longer exist.
 *
 * Both readers return an empty result rather than throwing when a regex stops
 * matching, so every caller must assert its own floor. A gate over a set it
 * never read reports "no drift".
 */

const HTTP_VERBS = ["get", "post", "patch", "delete", "put"] as const;

export interface ApiClientCall {
  readonly verb: string;
  readonly path: string;
}

/**
 * `apiClient.get<T>("/a/b")` and ``apiClient.patch(`/a/${id}`)`` alike, with
 * every `${…}` interpolation normalised to `:param` so a path matches the route
 * whatever the backend named its parameter.
 */
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

/**
 * `@Controller("blog/admin")` + `@Get("posts/:postId")` -> `GET /blog/admin/posts/:param`.
 * Route parameters are normalised the same way `apiClientCalls` normalises
 * interpolations, so the two sets are directly comparable.
 */
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

/** The `VERB /path` signatures a hook file calls that no listed controller declares. */
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
