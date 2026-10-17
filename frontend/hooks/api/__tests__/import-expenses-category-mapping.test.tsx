import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { useImportExpenses } from "@/hooks/api/use-import-expenses";

/**
 * HRMS-E2E-008: the import preview lets a person map an unknown category
 * ("Flights" -> Travel), but the request never carried the choice, so the
 * server filed the row as "Other". The mapping must reach the request body.
 */

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (_permission: string, options: object) => useMutation(options),
}));
jest.mock("@/lib/api-client", () => ({ apiClient: { post: jest.fn() } }));

const mockedPost = apiClient.post as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// jsdom's File has no text(); the request reads the file with it.
function csvFile(text: string) {
  const file = new File([text], "expenses.csv", { type: "text/csv" });
  Object.defineProperty(file, "text", { value: () => Promise.resolve(text) });
  return file;
}

beforeEach(() => mockedPost.mockReset().mockResolvedValue({ success: true, count: 1, skipped: 0 }));

describe("useImportExpenses", () => {
  it("sends the category mapping chosen in the preview", async () => {
    const { result } = renderHook(() => useImportExpenses(), { wrapper });
    await result.current.mutateAsync({
      file: csvFile("category,amount\nFlights,10\n"),
      autoApprove: false,
      categoryMapping: { Flights: "Travel" },
    });
    expect(mockedPost.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ categoryMapping: { Flights: "Travel" } }),
    );
  });

  it("sends no mapping when there is nothing to map", async () => {
    const { result } = renderHook(() => useImportExpenses(), { wrapper });
    await result.current.mutateAsync({ file: csvFile("category,amount\nTravel,10\n"), autoApprove: false });
    expect(mockedPost.mock.calls[0]?.[1]).not.toHaveProperty("categoryMapping");
  });
});
