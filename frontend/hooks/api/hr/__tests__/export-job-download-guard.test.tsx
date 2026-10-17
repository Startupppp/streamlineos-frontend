import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { downloadBlob } from "@/lib/download-blob";
import { useDownloadHrEmployeeExportJob } from "@/hooks/api/hr/import-export";
import { useDownloadExpenseExportJob } from "@/hooks/api/hr/expenses";

/**
 * HRMS-E2E-009: an export job's download must pass the same checks as every
 * other export — a zero-byte body or an HTML/JSON body is refused, not saved.
 *
 * `lib/download-export.ts` already made those checks, but the two export-job
 * downloads (employee directory, expenses) fetched the blob with a bare
 * `apiClient.download` and their callers saved whatever came back, with a
 * success toast. These hooks are the only route to those two endpoints, so the
 * guard sits here rather than in each caller.
 */

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useModuleEnabled: jest.fn().mockReturnValue(true),
  useAccess: jest.fn().mockReturnValue({ data: undefined, refetch: jest.fn() }),
}));

// The permission seam is covered by its own suite; here it only needs to run the mutation.
jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (_permission: string, options: object) => useMutation(options),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), download: jest.fn() },
}));

jest.mock("@/lib/download-blob", () => ({ downloadBlob: jest.fn() }));

const mockedDownload = apiClient.download as jest.Mock;
const mockedSave = downloadBlob as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const cases = [
  {
    name: "employee directory",
    hook: useDownloadHrEmployeeExportJob,
    endpoint: "/hr/export/jobs/job-1/download",
    fallbackName: "employee-directory.csv",
  },
  {
    name: "expenses",
    hook: useDownloadExpenseExportJob,
    endpoint: "/hr/expenses/export/jobs/job-1/download",
    fallbackName: "expenses.csv",
  },
] as const;

beforeEach(() => jest.clearAllMocks());

/** The error message, or "resolved". Plain strings keep a failure's diff small — a jsdom Blob is not. */
async function outcome(run: Promise<unknown>): Promise<string> {
  try {
    await run;
    return "resolved";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe.each(cases)("$name export-job download", ({ hook, endpoint, fallbackName }) => {
  it("refuses a zero-byte body and saves nothing", async () => {
    mockedDownload.mockResolvedValue(new Blob([], { type: "text/csv" }));
    const { result } = renderHook(() => hook(), { wrapper });

    expect(await outcome(result.current.mutateAsync("job-1"))).toMatch(/came back empty/);
    expect(mockedSave.mock.calls.length).toBe(0);
  });

  it("refuses an HTML error page and saves nothing", async () => {
    mockedDownload.mockResolvedValue(new Blob(["<html>502</html>"], { type: "text/html" }));
    const { result } = renderHook(() => hook(), { wrapper });

    expect(await outcome(result.current.mutateAsync("job-1"))).toMatch(/instead of a file/);
    expect(mockedSave.mock.calls.length).toBe(0);
  });

  it("saves a real CSV under the fallback name when the server sends none", async () => {
    mockedDownload.mockResolvedValue(new Blob(["id,name\n1,A\n"], { type: "text/csv" }));
    const { result } = renderHook(() => hook(), { wrapper });

    expect(await outcome(result.current.mutateAsync("job-1"))).toBe("resolved");
    expect(mockedDownload.mock.calls[0]?.[0]).toBe(endpoint);
    expect(mockedSave.mock.calls.map((call) => call[1])).toEqual([fallbackName]);
  });
});
