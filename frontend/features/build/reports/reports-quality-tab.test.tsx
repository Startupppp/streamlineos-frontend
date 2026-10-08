import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import type { TestRunListItem } from "@/types/projects";
import { useUpdateTestResult } from "@/hooks/api/build/qa";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockReplace = jest.fn();
let mockSearch = "tab=quality";
let mockAccess: "granted" | "denied" | "loading" = "granted";
let mockCanExecute = false;
jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/build/1/reports",
}));
jest.mock("@/lib/api-client", () => ({ apiClient: {
  get: (...args: unknown[]) => mockGet(...args),
  patch: (...args: unknown[]) => mockPatch(...args),
} }));
jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => mockAccess === "granted" && (permission === "build:qa:view" || (permission === "build:qa:execute" && mockCanExecute)),
  useAccess: () => ({ data: mockAccess === "loading" ? undefined : {
    isOrgOwner: false, scopes: mockAccess === "granted" ? { "build:qa:view": {}, ...(mockCanExecute ? { "build:qa:execute": {} } : {}) } : {},
  }, isLoading: mockAccess === "loading", isError: false }),
}));
jest.mock("@/hooks/api/entitlements", () => ({ useEntitlements: () => ({}) }));

import { ReportsQualityTab } from "./reports-quality-tab";

it("shows a desktop failures caption that toggles the associated filter", async () => {
  mount();
  await screen.findByRole("row", { name: /Regression run/ });
  const caption = screen.getByText("Completed runs with failures");
  expect(caption).toBeVisible();
  await userEvent.setup().click(caption);
  expect(lastParams().get("failuresOnly")).toBe("true");
  expect(lastParams().get("status")).toBe("completed");
});

const run: TestRunListItem = {
  id: 42, orgId: "org", projectId: 1, runNumber: 4, name: "Regression run",
  cycleId: null, releaseId: null, environment: null, browserDevice: null,
  testerId: null, testerMembershipId: null, status: "completed", startedAt: null,
  completedAt: null, createdBy: null, createdAt: "2026-10-05T00:00:00Z",
  updatedAt: "2026-10-05T00:00:00Z", deletedAt: null,
  passCount: 8, failCount: 2, blockedCount: 3, notRunCount: 4, skippedCount: 5,
};

function mount() {
  const client = createAppQueryClient("test:reports-quality113");
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, retry: false } });
  return { ...render(<QueryClientProvider client={client}><ReportsQualityTab projectId={1} /></QueryClientProvider>), client };
}
function lastParams() {
  return new URLSearchParams(mockReplace.mock.calls.at(-1)?.[0].split("?")[1]);
}
beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({ data: [run], hasMore: true, nextCursor: 42 });
  mockPatch.mockReset().mockResolvedValue({ status: "passed" });
  mockReplace.mockReset();
  mockAccess = "granted";
  mockCanExecute = false;
  mockSearch = "tab=quality";
});

it("refreshes displayed quality counts and filtered run pages after authorized execution without invalidating another project", async () => {
  mockCanExecute = true;
  const view = mount();
  await screen.findByRole("row", { name: /Regression run/ });
  const filteredKey = buildWorkQueryKeys.projects.qa.runs(1, { failuresOnly: "true" });
  const otherKey = buildWorkQueryKeys.projects.qa.runs(2);
  view.client.setQueryData(filteredKey, { data: [run], hasMore: false, nextCursor: null });
  view.client.setQueryData(otherKey, { data: [], hasMore: false, nextCursor: null });
  mockGet.mockResolvedValue({ data: [{ ...run, passCount: 9, failCount: 1 }], hasMore: false, nextCursor: null });
  function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={view.client}>{children}</QueryClientProvider>;
  }
  const mutation = renderHook(useUpdateTestResult, { wrapper });
  await act(async () => { await mutation.result.current.mutateAsync({ projectId: 1, runId: 42, resultId: 7, status: "passed" }); });
  await waitFor(() => expect(within(screen.getByRole("row", { name: /Regression run/ })).getByText("9")).toBeVisible());
  expect(view.client.getQueryState(filteredKey)?.isInvalidated).toBe(true);
  expect(view.client.getQueryState(otherKey)?.isInvalidated).toBe(false);
  expect(mockPatch).toHaveBeenCalledWith("/build/1/test-runs/42/results/7", { status: "passed" }, undefined, expect.anything());
});

it.each([false, true])("retains report data when execution is refused with execute permission %s", async (canExecute) => {
  mockCanExecute = canExecute;
  mockPatch.mockRejectedValue(new ApiError("Execution denied", 403));
  const view = mount();
  await screen.findByRole("row", { name: /Regression run/ });
  function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={view.client}>{children}</QueryClientProvider>;
  }
  const mutation = renderHook(useUpdateTestResult, { wrapper });
  await act(async () => {
    await expect(mutation.result.current.mutateAsync({ projectId: 1, runId: 42, resultId: 7, status: "passed" })).rejects.toThrow(canExecute ? "Execution denied" : "Missing permission: build:qa:execute");
  });
  expect(mockPatch).toHaveBeenCalledTimes(canExecute ? 1 : 0);
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(view.client.getQueryState(buildWorkQueryKeys.projects.qa.runs(1))?.isInvalidated).toBe(false);
  expect(within(screen.getByRole("row", { name: /Regression run/ })).getByText("8")).toBeVisible();
});

it("renders canonical run links and all five result counts with displayed-page scope", async () => {
  mount();
  const links = await screen.findAllByRole("link", { name: "Regression run" });
  links.forEach((link) => expect(link).toHaveAttribute("href", "/build/1/qa/runs/42"));
  const row = screen.getByRole("row", { name: /Regression run/ });
  for (const count of [8, 2, 3, 4, 5]) expect(within(row).getByText(String(count))).toBeVisible();
  expect(screen.getByText(/Counts cover the displayed page/)).toBeVisible();
  expect(screen.getAllByText("Displayed page")).toHaveLength(5);
  expect(mockGet).toHaveBeenCalledWith("/build/1/test-runs", {}, expect.any(AbortSignal), expect.anything());
});

it.each(["denied", "loading"] as const)("does not request QA data while access is %s", async (access) => {
  mockAccess = access;
  mount();
  await waitFor(() => expect(mockGet).not.toHaveBeenCalled());
  expect(screen.queryByText("No test runs")).not.toBeInTheDocument();
  expect(screen.queryByText("Quality results")).not.toBeInTheDocument();
  if (access === "denied") expect(screen.getByText(/permission/i)).toBeInTheDocument();
});

it("shows loading until the real read settles", () => {
  mockGet.mockImplementation(() => new Promise(() => {}));
  mount();
  expect(screen.queryByText("No test runs")).not.toBeInTheDocument();
  expect(screen.queryByText("Quality results")).not.toBeInTheDocument();
});

it("preserves successful zero counts and absent optional environment", async () => {
  mockGet.mockResolvedValue({ data: [{ ...run, passCount: 0, failCount: 0, blockedCount: 0, notRunCount: 0, skippedCount: 0 }], hasMore: false, nextCursor: null });
  mount();
  const row = await screen.findByRole("row", { name: /Regression run/ });
  expect(within(row).getAllByText("0")).toHaveLength(5);
  expect(within(row).getByText("—")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Next page" })).not.toBeInTheDocument();
});

it.each([false, true])("distinguishes empty and filtered-empty (filtered=%s)", async (filtered) => {
  if (filtered) mockSearch += "&q=regression&status=completed&failuresOnly=true";
  mockGet.mockResolvedValue({ data: [], hasMore: false, nextCursor: null });
  const view = mount();
  expect(await screen.findByText(filtered ? "No test runs match your filters" : "No test runs")).toBeVisible();
  expect(screen.queryByText("Displayed page")).not.toBeInTheDocument();
  if (!filtered) {
    expect(screen.getByRole("link", { name: "Open QA" })).toHaveAttribute("href", "/build/1/qa");
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
    return;
  }
  expect(screen.getAllByRole("button", { name: "Clear filters" })).toHaveLength(2);
  await userEvent.setup().click(within(screen.getByRole("status")).getByRole("button", { name: "Clear filters" }));
  for (const param of ["q", "status", "failuresOnly", "cursor", "cursors"]) expect(lastParams().has(param)).toBe(false);
  expect(lastParams().get("tab")).toBe("quality");
  mockSearch = lastParams().toString();
  view.rerender(<QueryClientProvider client={view.client}><ReportsQualityTab projectId={1} /></QueryClientProvider>);
  expect(await screen.findByRole("link", { name: "Open QA" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  await waitFor(() => expect(mockGet).toHaveBeenLastCalledWith("/build/1/test-runs", {}, expect.any(AbortSignal), expect.anything()));
});

it.each([403, 404, 503])("renders HTTP %s as failure rather than successful empty", async (status) => {
  mockGet.mockRejectedValue(new ApiError("Unavailable", status));
  mount();
  if (status === 404) expect(await screen.findByText("Not found")).toBeVisible();
  if (status === 403) expect(await screen.findByText("Unavailable")).toBeVisible();
  if (status === 503) {
    const retry = await screen.findByRole("button", { name: "Try again" });
    mockGet.mockResolvedValue({ data: [run], hasMore: false, nextCursor: null });
    await userEvent.setup().click(retry);
    expect(await screen.findByRole("row", { name: /Regression run/ })).toBeVisible();
    expect(mockGet).toHaveBeenCalledTimes(2);
  }
  expect(screen.queryByText("No test runs")).not.toBeInTheDocument();
});

it("forwards only supported filters and the cursor to the canonical API", async () => {
  mockSearch += '&q=regression&status=completed&failuresOnly=true&cursors=%5B%2242%22%5D';
  mount();
  await screen.findByRole("row", { name: /Regression run/ });
  expect(mockGet).toHaveBeenCalledWith("/build/1/test-runs", { q: "regression", status: "completed", failuresOnly: "true", cursor: "42" }, expect.any(AbortSignal), expect.anything());
  expect(screen.getByLabelText("Current page 2")).toHaveTextContent(/^2$/);
  expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
});

it("writes next and previous cursors to the URL without inventing a total", async () => {
  const user = userEvent.setup();
  const view = mount();
  await screen.findByRole("row", { name: /Regression run/ });
  await user.click(screen.getByRole("button", { name: "Next page" }));
  expect(lastParams().get("cursors")).toBe('["42"]');
  expect(lastParams().get("tab")).toBe("quality");
  mockSearch = lastParams().toString();
  view.rerender(<QueryClientProvider client={view.client}><ReportsQualityTab projectId={1} /></QueryClientProvider>);
  await screen.findByRole("row", { name: /Regression run/ });
  await user.click(screen.getByRole("button", { name: "Previous page" }));
  expect(lastParams().has("cursors")).toBe(false);
});

it("resets cursor stack when failures-only changes and preserves the report tab", async () => {
  mockSearch += '&cursors=%5B%2242%22%5D&cursor=42';
  mount();
  await screen.findByRole("row", { name: /Regression run/ });
  await userEvent.setup().click(screen.getByRole("switch", { name: "Completed runs with failures" }));
  expect(lastParams().get("failuresOnly")).toBe("true");
  expect(lastParams().get("status")).toBe("completed");
  expect(lastParams().get("tab")).toBe("quality");
  expect(lastParams().has("cursors")).toBe(false);
  expect(lastParams().has("cursor")).toBe(false);
  expect(mockReplace).toHaveBeenLastCalledWith(expect.any(String), { scroll: false });
});

it("debounces search before sending it to the API and resets pagination", async () => {
  const view = mount();
  await screen.findByRole("row", { name: /Regression run/ });
  await userEvent.setup().type(screen.getByPlaceholderText("Search test runs…"), "regression");
  await waitFor(() => expect(lastParams().get("q")).toBe("regression"));
  mockSearch = lastParams().toString();
  view.rerender(<QueryClientProvider client={view.client}><ReportsQualityTab projectId={1} /></QueryClientProvider>);
  await waitFor(() => expect(mockGet).toHaveBeenLastCalledWith("/build/1/test-runs", { q: "regression" }, expect.any(AbortSignal), expect.anything()));
});

it("changes status and clears every filter with cursor reset", async () => {
  mockSearch += '&q=regression&status=completed&failuresOnly=true&cursors=%5B%2242%22%5D';
  const view = mount();
  await screen.findByRole("row", { name: /Regression run/ });
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Status" }), { key: "ArrowDown" });
  await userEvent.setup().click(await screen.findByRole("option", { name: "In Progress" }));
  expect(lastParams().get("status")).toBe("in_progress");
  expect(lastParams().has("failuresOnly")).toBe(false);
  expect(lastParams().has("cursors")).toBe(false);
  mockSearch = lastParams().toString();
  view.rerender(<QueryClientProvider client={view.client}><ReportsQualityTab projectId={1} /></QueryClientProvider>);
  await screen.findByRole("row", { name: /Regression run/ });
  await userEvent.setup().click(screen.getByRole("button", { name: "Clear filters" }));
  for (const param of ["q", "status", "failuresOnly", "cursor", "cursors"]) expect(lastParams().has(param)).toBe(false);
  expect(lastParams().get("tab")).toBe("quality");
});

it("sums only the returned cursor page and retains every run link", async () => {
  mockGet.mockResolvedValue({ data: [run, { ...run, id: 41, name: "Smoke run" }], hasMore: true, nextCursor: 41 });
  mount();
  await screen.findByRole("row", { name: /Smoke run/ });
  expect(screen.getAllByRole("link", { name: "Smoke run" })[0]).toHaveAttribute("href", "/build/1/qa/runs/41");
  for (const count of [16, 4, 6, 8, 10]) expect(screen.getAllByText(String(count)).length).toBeGreaterThan(0);
  expect(screen.getAllByText("Displayed page")).toHaveLength(5);
});

it("requests completed failures when enabled and removes failures when selecting an incompatible status", async () => {
  mockSearch += "&status=in_progress";
  const view = mount();
  const user = userEvent.setup();
  await screen.findByRole("row", { name: /Regression run/ });
  await user.click(screen.getByRole("switch", { name: "Completed runs with failures" }));
  mockSearch = lastParams().toString();
  view.rerender(<QueryClientProvider client={view.client}><ReportsQualityTab projectId={1} /></QueryClientProvider>);
  await waitFor(() => expect(mockGet).toHaveBeenLastCalledWith("/build/1/test-runs", { status: "completed", failuresOnly: "true" }, expect.any(AbortSignal), expect.anything()));
  expect(await screen.findByRole("switch", { name: "Completed runs with failures" })).toBeChecked();
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Status" }), { key: "ArrowDown" });
  await user.click(await screen.findByRole("option", { name: "Aborted" }));
  mockSearch = lastParams().toString();
  view.rerender(<QueryClientProvider client={view.client}><ReportsQualityTab projectId={1} /></QueryClientProvider>);
  await waitFor(() => expect(mockGet).toHaveBeenLastCalledWith("/build/1/test-runs", { status: "aborted" }, expect.any(AbortSignal), expect.anything()));
  expect(await screen.findByRole("switch", { name: "Completed runs with failures" })).not.toBeChecked();
});

it("keeps a settled search cleared after URL refresh and the debounce window", async () => {
  mockSearch += "&q=QA-113&status=in_progress";
  const view = mount();
  await screen.findByRole("row", { name: /Regression run/ });
  expect(screen.getByPlaceholderText("Search test runs…")).toHaveValue("QA-113");
  await userEvent.setup().click(screen.getByRole("button", { name: "Clear filters" }));
  mockSearch = lastParams().toString();
  view.rerender(<QueryClientProvider client={view.client}><ReportsQualityTab projectId={1} /></QueryClientProvider>);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 450)); });
  expect(lastParams().has("q")).toBe(false);
  expect(lastParams().has("status")).toBe(false);
  expect(lastParams().get("tab")).toBe("quality");
  expect(screen.getByPlaceholderText("Search test runs…")).toHaveValue("");
  expect(mockGet).toHaveBeenLastCalledWith("/build/1/test-runs", {}, expect.any(AbortSignal), expect.anything());
});
