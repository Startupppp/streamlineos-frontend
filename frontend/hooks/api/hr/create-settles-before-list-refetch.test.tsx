import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCreateExpense } from "./expenses";
import { useCreateHrAnnouncement } from "./announcements";
import { useCreateAsset } from "./hr-settings";


const mockPost = jest.fn();
jest.mock("@/lib/api-client", () => ({ apiClient: { post: (...a: unknown[]) => mockPost(...a), get: jest.fn() } }));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useModuleEnabled: () => true,
  useAccess: () => ({ data: {}, refetch: jest.fn() }),
}));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const NEVER = new Promise<void>(() => undefined);

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  jest.spyOn(client, "invalidateQueries").mockReturnValue(NEVER);
  mockPost.mockResolvedValue({ id: 1 });
});

async function settlesWithin(promise: Promise<unknown>, ms = 500): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), ms);
  });
  const settled = promise.then(() => true);
  const result = await Promise.race([settled, timeout]);
  clearTimeout(timer);
  return result;
}

describe("a create settles without waiting for its list to refetch", () => {
  it("expense submit", async () => {
    const { result } = renderHook(() => useCreateExpense(), { wrapper });
    let settled = false;
    await act(async () => {
      settled = await settlesWithin(
        result.current.mutateAsync({ body: { category: "Travel", amount: 10, expenseDate: "2026-10-13" } }),
      );
    });
    expect(settled).toBe(true);
    expect(client.invalidateQueries).toHaveBeenCalled();
  });

  it("announcement create", async () => {
    const { result } = renderHook(() => useCreateHrAnnouncement(), { wrapper });
    let settled = false;
    await act(async () => {
      settled = await settlesWithin(
        result.current.mutateAsync({
          title: "Holiday",
          content: "Office closed",
          targetType: "ALL",
          targetIds: [],
          isPinned: false,
          status: "PUBLISHED",
          attachmentUrls: [],
        }),
      );
    });
    expect(settled).toBe(true);
    expect(client.invalidateQueries).toHaveBeenCalled();
  });

  it("asset create", async () => {
    const { result } = renderHook(() => useCreateAsset(), { wrapper });
    let settled = false;
    await act(async () => {
      settled = await settlesWithin(
        result.current.mutateAsync({
          name: "MacBook",
          type: "Laptop",
          brand: "Apple",
          model: "M3",
          serialNumber: "SN-1",
        }),
      );
    });
    expect(settled).toBe(true);
    expect(client.invalidateQueries).toHaveBeenCalled();
  });
});
