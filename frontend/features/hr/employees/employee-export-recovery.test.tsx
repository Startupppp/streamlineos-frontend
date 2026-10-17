import React from "react";
import { act, render, screen } from "@testing-library/react";
import { EmployeeExportAction } from "./employee-export-action";
import { exportJobStorageKey } from "./employee-export-job-storage";
import { ApiError } from "@/lib/api-envelope";
import type { HrEmployeeExportJob } from "@/hooks/api/hr/import-export";

/**
 * Ticket 04. The export job id lived only in this component's state, so leaving
 * `/hr/employees` abandoned a running server-side job and its finished file was
 * unreachable. These cases pin the three properties that matter: the id is
 * recovered per user and organisation, recovery polls instead of creating a
 * second export, and a job from another scope is never picked up.
 */
const SCOPE = "org-1::user-1";
let currentScope = SCOPE;

jest.mock("@/lib/org-scoped-storage", () => ({
  ...jest.requireActual("@/lib/org-scoped-storage"),
  useOrgStorageScope: () => currentScope,
}));

const createMutate = jest.fn();
const downloadMutate = jest.fn();
const polled: (string | null)[] = [];
let jobResult: {
  data?: HrEmployeeExportJob;
  error?: Error | null;
  isError: boolean;
} = { isError: false };

jest.mock("@/hooks/api/hr/import-export", () => ({
  useCreateHrEmployeeExportJob: () => ({ mutate: createMutate, isPending: false }),
  useDownloadHrEmployeeExportJob: () => ({ mutate: downloadMutate, isPending: false }),
  useHrEmployeeExportJob: (exportJobId: string | null) => {
    polled.push(exportJobId);
    // The real hook is disabled without an id, so a cleared store means no read
    // and no error — the button goes back to offering a fresh export.
    return exportJobId === null ? { isError: false } : jobResult;
  },
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

function completedJob(id: string): HrEmployeeExportJob {
  return {
    id,
    entity: "employees",
    status: "completed",
    processedRows: 12,
    rowCount: 12,
    fileName: "employee-directory.csv",
    errorCode: null,
    errorMessage: null,
    createdAt: "2026-09-26T00:00:00.000Z",
    updatedAt: "2026-09-26T00:00:10.000Z",
    completedAt: "2026-09-26T00:00:10.000Z",
    expiresAt: null,
  };
}

beforeEach(() => {
  localStorage.clear();
  polled.length = 0;
  currentScope = SCOPE;
  jobResult = { isError: false };
  jest.clearAllMocks();
});

it("recovers the stored job and polls it without starting a second export", async () => {
  localStorage.setItem(exportJobStorageKey(SCOPE), "job-running");
  jobResult = {
    isError: false,
    data: { ...completedJob("job-running"), status: "running", processedRows: 40 },
  };

  render(<EmployeeExportAction filters={{}} />);

  expect(await screen.findByRole("button", { name: /Exporting 40/ })).toBeDisabled();
  expect(polled).toContain("job-running");
  expect(createMutate).not.toHaveBeenCalled();
});

it("offers the download when the recovered job has finished", async () => {
  localStorage.setItem(exportJobStorageKey(SCOPE), "job-done");
  jobResult = { isError: false, data: completedJob("job-done") };

  render(<EmployeeExportAction filters={{}} />);

  expect(
    await screen.findByRole("button", { name: "Download export" }),
  ).toBeEnabled();
  expect(createMutate).not.toHaveBeenCalled();
});

it("ignores a job stored for a different user or organisation", async () => {
  localStorage.setItem(exportJobStorageKey("org-2::user-9"), "other-tenant-job");

  render(<EmployeeExportAction filters={{}} />);

  expect(await screen.findByRole("button", { name: "Export" })).toBeEnabled();
  expect(polled).not.toContain("other-tenant-job");
});

it("persists a newly created job so the next visit recovers it", async () => {
  render(<EmployeeExportAction filters={{}} />);

  act(() => screen.getByRole("button", { name: "Export" }).click());
  const [, options] = createMutate.mock.calls[0];
  act(() => options.onSuccess(completedJob("job-new")));

  expect(localStorage.getItem(exportJobStorageKey(SCOPE))).toBe("job-new");
});

it("forgets a stored job the server no longer serves", async () => {
  localStorage.setItem(exportJobStorageKey(SCOPE), "job-gone");
  jobResult = {
    isError: true,
    error: new ApiError("Export job not found", 404, "NOT_FOUND"),
  };

  render(<EmployeeExportAction filters={{}} />);

  expect(await screen.findByRole("button", { name: "Export" })).toBeEnabled();
  expect(localStorage.getItem(exportJobStorageKey(SCOPE))).toBeNull();
});

it("keeps a running job through a transient read failure", async () => {
  localStorage.setItem(exportJobStorageKey(SCOPE), "job-running");
  jobResult = {
    isError: true,
    error: new ApiError("Service unavailable", 503, "BACKEND_UNREACHABLE"),
  };

  render(<EmployeeExportAction filters={{}} />);

  expect(await screen.findByRole("button", { name: "Retry export" })).toBeEnabled();
  expect(localStorage.getItem(exportJobStorageKey(SCOPE))).toBe("job-running");
});
