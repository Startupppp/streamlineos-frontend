import { queryKeys } from "@/lib/query-keys";
import {
  WORKERS_PAGE_SIZE,
  workersListKey,
  workersListParams,
} from "@/lib/query-keys/directory-workers-list";

describe("the workers list key", () => {
  it("is the same whether a server prefetch or the hook builds it", () => {
    const fromPrefetch = workersListKey();
    const fromHook = queryKeys.directory.workers(workersListParams());
    expect(fromPrefetch).toEqual(fromHook);
  });

  it("defaults to the page size the prefetch requests", () => {
    expect(workersListParams()).toMatchObject({ limit: WORKERS_PAGE_SIZE });
  });

  it("changes key when a filter is applied, so a filtered view is not served the unfiltered page", () => {
    expect(workersListKey({ status: "ACTIVE" })).not.toEqual(workersListKey());
  });

  it("omits an absent filter rather than keying on undefined", () => {
    expect(workersListParams()).not.toHaveProperty("status");
    expect(workersListParams({ search: "" })).not.toHaveProperty("search");
  });
});
