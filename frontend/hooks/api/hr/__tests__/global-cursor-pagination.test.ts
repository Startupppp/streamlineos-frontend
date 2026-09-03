import { useQuery } from "@tanstack/react-query";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import {
  useWorkAuthorizations,
  useComplianceRequirements,
  useComplianceEvents,
  useContracts,
} from "../global";

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQuery: jest.fn((options: unknown) => options),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  useMutation: jest.fn(),
  keepPreviousData: undefined,
}));
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: (fn: () => unknown) => fn(),
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useModuleEnabled: jest.fn(),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/get-error-message", () => ({ getErrorMessage: jest.fn((e: unknown) => String(e)) }));
jest.mock("@/lib/query-keys", () => ({
  queryKeys: {
    hr: {
      workAuthorizations: (p: unknown) => ["streamlineos", "hr", "global", "workAuthorizations", p],
      complianceRequirements: (p: unknown) => ["streamlineos", "hr", "global", "complianceRequirements", p],
      complianceEvents: (p: unknown) => ["streamlineos", "hr", "global", "complianceEvents", p],
      contracts: (p: unknown) => ["streamlineos", "hr", "global", "contracts", p],
      workAuthorization: (id: number) => ["streamlineos", "hr", "global", "workAuthorization", id],
      complianceRequirement: (id: number) => ["streamlineos", "hr", "global", "complianceRequirement", id],
      contract: (id: number) => ["streamlineos", "hr", "global", "contract", id],
      internshipCertificate: (id: number) => ["streamlineos", "hr", "global", "contracts", id, "certificate"],
    },
  },
}));

const mockQuery = useQuery as jest.Mock;
const mockCan = useCan as jest.Mock;
const mockModuleEnabled = useModuleEnabled as jest.Mock;

const cursorResponse = {
  data: [],
  pagination: { limit: 20, hasMore: false, nextCursor: null },
};

type QueryOpts = { queryFn: (context: { signal?: AbortSignal }) => unknown };

function captureOpts<T extends QueryOpts>(call: () => void): T {
  mockQuery.mockImplementation((opts: unknown) => opts);
  call();
  return mockQuery.mock.calls.at(-1)?.[0] as T;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCan.mockReturnValue(true);
  mockModuleEnabled.mockReturnValue(true);
});

describe("useWorkAuthorizations — cursor pagination contract", () => {
  it("sends no cursor param on page 1", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = captureOpts<QueryOpts>(() => useWorkAuthorizations({ limit: 20 }));
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/global/work-authorizations",
      expect.not.objectContaining({ cursor: expect.anything() }),
      undefined,
    );
  });

  it("sends cursor on page 2", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = captureOpts<QueryOpts>(() => useWorkAuthorizations({ cursor: "eyJpZCI6MjB9", limit: 20 }));
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/global/work-authorizations",
      expect.objectContaining({ cursor: "eyJpZCI6MjB9" }),
      undefined,
    );
  });

  it("never sends a page parameter", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = captureOpts<QueryOpts>(() => useWorkAuthorizations({ limit: 20 }));
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/global/work-authorizations",
      expect.not.objectContaining({ page: expect.anything() }),
      undefined,
    );
  });

  it("BITES: fails when cursor is absent but page 2 cursor is expected", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = captureOpts<QueryOpts>(() => useWorkAuthorizations({ cursor: "eyJpZCI6NX0", limit: 20 }));
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/global/work-authorizations",
      expect.objectContaining({ cursor: "eyJpZCI6NX0" }),
      undefined,
    );
  });
});

describe("useComplianceRequirements — cursor pagination contract", () => {
  it("sends no cursor param on page 1", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = captureOpts<QueryOpts>(() => useComplianceRequirements({ limit: 20 }));
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/global/compliance/requirements",
      expect.not.objectContaining({ cursor: expect.anything() }),
      undefined,
    );
  });

  it("sends cursor on page 2", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = captureOpts<QueryOpts>(() => useComplianceRequirements({ cursor: "eyJpZCI6MjB9", limit: 20 }));
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/global/compliance/requirements",
      expect.objectContaining({ cursor: "eyJpZCI6MjB9" }),
      undefined,
    );
  });

  it("never sends a page parameter", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = captureOpts<QueryOpts>(() => useComplianceRequirements({ limit: 20 }));
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/global/compliance/requirements",
      expect.not.objectContaining({ page: expect.anything() }),
      undefined,
    );
  });

  it("BITES: fails when cursor is absent but page 2 cursor is expected", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = captureOpts<QueryOpts>(() => useComplianceRequirements({ cursor: "eyJpZCI6NX0", limit: 20 }));
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/global/compliance/requirements",
      expect.objectContaining({ cursor: "eyJpZCI6NX0" }),
      undefined,
    );
  });
});

describe("useComplianceEvents — cursor pagination contract", () => {
  it("sends no cursor param on page 1", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = captureOpts<QueryOpts>(() => useComplianceEvents({ limit: 20 }));
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/global/compliance/events",
      expect.not.objectContaining({ cursor: expect.anything() }),
      undefined,
    );
  });

  it("sends cursor on page 2", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = captureOpts<QueryOpts>(() => useComplianceEvents({ cursor: "eyJpZCI6MjB9", limit: 20 }));
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/global/compliance/events",
      expect.objectContaining({ cursor: "eyJpZCI6MjB9" }),
      undefined,
    );
  });

  it("never sends a page parameter", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = captureOpts<QueryOpts>(() => useComplianceEvents({ limit: 20 }));
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/global/compliance/events",
      expect.not.objectContaining({ page: expect.anything() }),
      undefined,
    );
  });

  it("BITES: fails when cursor is absent but page 2 cursor is expected", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = captureOpts<QueryOpts>(() => useComplianceEvents({ cursor: "eyJpZCI6MTB9", limit: 20 }));
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/global/compliance/events",
      expect.objectContaining({ cursor: "eyJpZCI6MTB9" }),
      undefined,
    );
  });
});

describe("useContracts — cursor pagination contract", () => {
  it("sends no cursor param on page 1", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = captureOpts<QueryOpts>(() => useContracts({ limit: 20 }));
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/global/contracts",
      expect.not.objectContaining({ cursor: expect.anything() }),
      undefined,
    );
  });

  it("sends cursor on page 2", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = captureOpts<QueryOpts>(() => useContracts({ cursor: "eyJpZCI6MjB9", limit: 20 }));
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/global/contracts",
      expect.objectContaining({ cursor: "eyJpZCI6MjB9" }),
      undefined,
    );
  });

  it("never sends a page parameter", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = captureOpts<QueryOpts>(() => useContracts({ limit: 20 }));
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/global/contracts",
      expect.not.objectContaining({ page: expect.anything() }),
      undefined,
    );
  });

  it("BITES: fails when cursor is absent but page 2 cursor is expected", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = captureOpts<QueryOpts>(() => useContracts({ cursor: "eyJpZCI6NX0", limit: 20 }));
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/global/contracts",
      expect.objectContaining({ cursor: "eyJpZCI6NX0" }),
      undefined,
    );
  });
});
