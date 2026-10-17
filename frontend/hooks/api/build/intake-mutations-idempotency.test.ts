import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useRouteFeedbucketToIntake } from "@/hooks/api/build/intake-mutations";
import { IDEMPOTENCY_HEADER } from "@/lib/idempotency-key";

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn().mockResolvedValue({ intakeId: 10, created: true }) },
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as { apiClient: { post: jest.Mock } };
const mockPost = apiClient.post;

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { permissions: ["feedbucket:submissions:manage"] }, refetch: jest.fn() }),
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: jest.fn((factory: () => unknown) => factory),
}));

const FIXED_KEY = "idp-fixed-abc123";
jest.mock("@/hooks/common/use-idempotent-operation", () => ({
  useIdempotentOperation: jest.fn(() => ({
    configFor: jest.fn((_input: unknown) => ({
      headers: { [IDEMPOTENCY_HEADER]: FIXED_KEY },
    })),
    settle: jest.fn(),
  })),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

describe("useRouteFeedbucketToIntake — idempotency-key forwarding", () => {
  beforeEach(() => jest.clearAllMocks());

  it("passes the Idempotency-Key header to apiClient.post when routing a submission to intake", async () => {
    const { result } = renderHook(() => useRouteFeedbucketToIntake(), { wrapper });

    await act(async () => {
      result.current.mutate({ submissionId: 41, projectId: 6 });
    });

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url, _body, config] = mockPost.mock.calls[0] as [string, unknown, Record<string, unknown>];
    expect(url).toContain("/feedbucket/submissions/41/route-to-intake");
    expect(config).toMatchObject({
      headers: { [IDEMPOTENCY_HEADER]: FIXED_KEY },
    });
  });

  it("passes the same key on retry (same submissionId + projectId), not a new one each call", async () => {
    const { useIdempotentOperation } = jest.requireMock(
      "@/hooks/common/use-idempotent-operation",
    ) as { useIdempotentOperation: jest.Mock };

    const configForMock = jest.fn((_input: unknown) => ({
      headers: { [IDEMPOTENCY_HEADER]: FIXED_KEY },
    }));
    useIdempotentOperation.mockReturnValue({
      configFor: configForMock,
      settle: jest.fn(),
    });

    const { result } = renderHook(() => useRouteFeedbucketToIntake(), { wrapper });

    await act(async () => {
      result.current.mutate({ submissionId: 41, projectId: 6 });
    });
    await act(async () => {
      result.current.mutate({ submissionId: 41, projectId: 6 });
    });

    expect(configForMock).toHaveBeenCalledTimes(2);
    const keys = mockPost.mock.calls.map(
      (call) => (call[2] as { headers: Record<string, string> })?.headers?.[IDEMPOTENCY_HEADER],
    );
    expect(keys[0]).toBe(FIXED_KEY);
    expect(keys[1]).toBe(FIXED_KEY);
  });
});
