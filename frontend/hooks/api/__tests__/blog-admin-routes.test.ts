import { backendPath } from "@/test-utils/backend-repo";
import { declaredRoutes, unresolvedCalls } from "@/test-utils/backend-routes";

/**
 * Every path the blog admin hooks call is a route the backend declares.
 *
 * `useAdminBlogCategories` called `GET /blog/admin/categories`, which never
 * existed: `BlogAdminController` declares `POST categories` and
 * `PATCH|DELETE categories/:categoryId`, and the only `GET categories` in the
 * module is the `@Public()` one on `BlogController`. Every holder of
 * `blog:categories:manage` who opened the Categories tab got a 404 and an
 * ErrorState, so the create/edit/delete flows that do exist had nothing to
 * operate on — and the category picker in the post form was empty for the same
 * reason.
 *
 * Nothing caught it: the client type existed, the hook compiled, the component
 * test mocks the hook, and `check:permission-binding` counts an unresolvable
 * path without failing on it.
 *
 * ANTI-VACUITY. Both readers carry a floor. A regex that stops matching reports
 * "every path resolves" over a set it never read.
 */

const MEASURED_CALL_FLOOR = 9;
const MEASURED_ROUTE_FLOOR = 12;

const FE_HOOKS = require.resolve("../blog-admin.ts");
const BACKEND_CONTROLLERS = [
  backendPath("src", "modules", "blog", "blog-admin.controller.ts"),
  backendPath("src", "modules", "blog", "blog.controller.ts"),
];

describe("blog admin hooks — every called path is a declared backend route", () => {
  it("resolves every apiClient path in hooks/api/blog-admin.ts", () => {
    const { calls, routes, unresolved } = unresolvedCalls(
      FE_HOOKS,
      BACKEND_CONTROLLERS,
    );

    expect(calls.length).toBeGreaterThanOrEqual(MEASURED_CALL_FLOOR);
    expect(routes.size).toBeGreaterThanOrEqual(MEASURED_ROUTE_FLOOR);
    expect(unresolved).toEqual([]);
  });

  it("the admin category list is a separate route from the public one", () => {
    const routes = declaredRoutes(BACKEND_CONTROLLERS);
    // The public GET /blog/categories counts PUBLISHED posts only and is rate
    // limited under blog:public-read; the admin list must not be repointed at it.
    expect(routes.has("GET /blog/categories")).toBe(true);
    expect(routes.has("GET /blog/admin/categories")).toBe(true);
  });
});
