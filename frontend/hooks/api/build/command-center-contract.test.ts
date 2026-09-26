import { allWorkPageContract } from "@/hooks/api/build/build-tickets-subresource-schema";
import {
  COMMAND_CENTER_MY_ISSUES_FILTERS,
  COMMAND_CENTER_MY_ISSUES_PAGE_SIZE,
} from "@/hooks/api/build/all-work";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const minimalTicket = {
  id: 1,
  title: "Overdue task",
  type: "TASK",
  status: "IN_PROGRESS",
  priority: "HIGH",
  projectId: 10,
  projectKey: "BLD",
  projectName: "Build",
  ticketNumber: 1,
  dueDate: "2026-09-25T00:00:00.000Z",
  startDate: null,
  points: null,
  estimate: null,
  rank: "a0",
  cycleId: null,
  epicId: null,
  assigneeId: null,
  assignee: null,
  labels: [],
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("COMMAND_CENTER_MY_ISSUES_FILTERS — stat query shape", () => {
  it("scopes to the current user so the My Issues panel shows only the viewer's own open work", () => {
    expect(COMMAND_CENTER_MY_ISSUES_FILTERS.scope).toBe("mine");
  });

  it("orders by dueDate ascending so the nearest-due items appear first in the panel", () => {
    expect(COMMAND_CENTER_MY_ISSUES_FILTERS.orderBy).toBe("dueDate");
    expect(COMMAND_CENTER_MY_ISSUES_FILTERS.orderDir).toBe("asc");
  });

  it("excludes DONE and CANCELLED so the count stat never inflates with completed work", () => {
    expect(COMMAND_CENTER_MY_ISSUES_FILTERS.excludeStatus).toBe("DONE,CANCELLED");
  });

  it("uses the page-size constant so the query and the filter agree on the batch size", () => {
    expect(COMMAND_CENTER_MY_ISSUES_FILTERS.limit).toBe(COMMAND_CENTER_MY_ISSUES_PAGE_SIZE);
  });
});

describe("allWorkPageContract — command-center data use cases", () => {
  it("parses a non-empty page so the My Issues panel has data to render", () => {
    const page = { data: [minimalTicket], limit: 15, nextCursor: null, hasMore: false };
    const parsed = allWorkPageContract.parse(page);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0]?.title).toBe("Overdue task");
  });

  it("parses an empty page with hasMore false so the panel renders the empty state instead of looping", () => {
    const page = { data: [], limit: 15, nextCursor: null, hasMore: false };
    const parsed = allWorkPageContract.parse(page);
    expect(parsed.data).toHaveLength(0);
    expect(parsed.hasMore).toBe(false);
  });

  it("parses a full first page with a string nextCursor so infinite scroll can continue from the command center panel", () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({ ...minimalTicket, id: i + 1, ticketNumber: i + 1 }));
    const page = { data: rows, limit: 15, nextCursor: "cursor-abc", hasMore: true };
    const parsed = allWorkPageContract.parse(page);
    expect(parsed.nextCursor).toBe("cursor-abc");
    expect(parsed.hasMore).toBe(true);
  });
});

describe("buildWorkQueryKeys — command-center cache key isolation", () => {
  it("the my-issues key is distinct from the bare allWork key so clearing the command-center panel does not flush every all-work screen", () => {
    const myIssuesKey = buildWorkQueryKeys.projects.allWork(COMMAND_CENTER_MY_ISSUES_FILTERS);
    const bareKey = buildWorkQueryKeys.projects.allWork();
    expect(myIssuesKey).not.toEqual(bareKey);
  });

  it("the infinite scroll key has 'infinite' appended so useInfiniteAllWork and useAllWork occupy separate cache slots for the same filter set", () => {
    const finiteKey = buildWorkQueryKeys.projects.allWork(COMMAND_CENTER_MY_ISSUES_FILTERS);
    const infiniteKey = buildWorkQueryKeys.projects.allWorkInfinite(COMMAND_CENTER_MY_ISSUES_FILTERS);
    const infiniteStr = JSON.stringify(infiniteKey);
    expect(infiniteStr).toContain("infinite");
    expect(infiniteKey).not.toEqual(finiteKey);
  });

  it("two different filter objects with different scope values produce different keys so a scope=all stat does not pollute scope=mine cache entries", () => {
    const mineKey = buildWorkQueryKeys.projects.allWork({ scope: "mine" });
    const allKey = buildWorkQueryKeys.projects.allWork({ scope: "all" });
    expect(mineKey).not.toEqual(allKey);
  });
});
