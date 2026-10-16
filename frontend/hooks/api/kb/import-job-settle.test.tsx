import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";

const mockGet = jest.fn();
jest.mock("@/lib/api-client", () => ({ apiClient: { get: (...args: unknown[]) => mockGet(...args) } }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

import { useKbImportJob } from "./import-export";

function setup(status: string) {
  mockGet.mockResolvedValue({ id: 1, status });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = jest.spyOn(client, "invalidateQueries");
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  renderHook(() => useKbImportJob(1), { wrapper });
  return invalidate;
}

describe("KB-B-019 a settled import refreshes Recent imports and the wiki lists", () => {
  it("invalidates the import history and page lists once the job completes", async () => {
    const invalidate = setup("completed");
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: knowledgeAndSurveysQueryKeys.kb.importJobs(), exact: true }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree() });
  });

  it("does not invalidate while the job is still running", async () => {
    const invalidate = setup("processing");
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(invalidate).not.toHaveBeenCalled();
  });
});
