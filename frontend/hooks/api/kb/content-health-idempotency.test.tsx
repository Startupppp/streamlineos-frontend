import { render } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { useBulkRepairHealthItems, useDismissHealthItem } from "./content-health";

type BulkRepairInput = {
  pageIds: number[];
  kind: "unowned";
  repairAction: "assign_owner";
  assigneeMembershipId: number;
};

type DismissInput = {
  pageId: number;
  kind: "unowned";
  reason: string;
};

type MutationOptions = {
  mutationFn: (input: BulkRepairInput | DismissInput) => Promise<unknown>;
  onSuccess: () => void;
};

let mutationOptions: MutationOptions;

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: jest.fn((_permission: string, options: MutationOptions) => {
    mutationOptions = options;
    return {};
  }),
}));

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual<object>("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  };
});

function Hook() {
  useBulkRepairHealthItems();
  return null;
}

function DismissHook() {
  useDismissHealthItem();
  return null;
}

describe("useBulkRepairHealthItems replay key", () => {
  it("reuses one key for a retry and creates another after success", async () => {
    const post = jest.spyOn(apiClient, "post")
      .mockRejectedValueOnce(new Error("network timeout"))
      .mockResolvedValue({ results: [] });
    try {
      render(<Hook />);
      const input: BulkRepairInput = {
        pageIds: [2, 3],
        kind: "unowned",
        repairAction: "assign_owner",
        assigneeMembershipId: 7,
      };
      await expect(mutationOptions.mutationFn(input)).rejects.toThrow("network timeout");
      await mutationOptions.mutationFn(input);
      const firstKey = (post.mock.calls[0]?.[2] as { headers: Record<string, string> }).headers["Idempotency-Key"];
      const retryKey = (post.mock.calls[1]?.[2] as { headers: Record<string, string> }).headers["Idempotency-Key"];
      expect(firstKey).toBeTruthy();
      expect(retryKey).toBe(firstKey);
      mutationOptions.onSuccess();
      await mutationOptions.mutationFn(input);
      const nextKey = (post.mock.calls[2]?.[2] as { headers: Record<string, string> }).headers["Idempotency-Key"];
      expect(nextKey).toBeTruthy();
      expect(nextKey).not.toBe(firstKey);
    } finally {
      post.mockRestore();
    }
  });
});

describe("useDismissHealthItem replay key", () => {
  it("reuses one key for a retry and creates another after success", async () => {
    const post = jest.spyOn(apiClient, "post")
      .mockRejectedValueOnce(new Error("network timeout"))
      .mockResolvedValue({ id: 1 });
    try {
      render(<DismissHook />);
      const input: DismissInput = { pageId: 2, kind: "unowned", reason: "Expected" };
      await expect(mutationOptions.mutationFn(input)).rejects.toThrow("network timeout");
      await mutationOptions.mutationFn(input);
      const firstKey = (post.mock.calls[0]?.[2] as { headers: Record<string, string> }).headers["Idempotency-Key"];
      const retryKey = (post.mock.calls[1]?.[2] as { headers: Record<string, string> }).headers["Idempotency-Key"];
      expect(firstKey).toBeTruthy();
      expect(retryKey).toBe(firstKey);
      mutationOptions.onSuccess();
      await mutationOptions.mutationFn(input);
      const nextKey = (post.mock.calls[2]?.[2] as { headers: Record<string, string> }).headers["Idempotency-Key"];
      expect(nextKey).toBeTruthy();
      expect(nextKey).not.toBe(firstKey);
    } finally {
      post.mockRestore();
    }
  });
});
