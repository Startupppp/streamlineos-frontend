"use client";

import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCreateView, useDeleteView } from "./advanced";
import { useCreateProjectCustomField, useDeleteProjectCustomField } from "./custom-fields";
import { useCreateAgentToken, useRevokeAgentToken } from "./agent-tokens";
import { useCreateTransition, useDeleteTransition } from "./workflow";
import { useCreateAutomation, useDeleteAutomation } from "./automations";
import { useCreateWebhook, useDeleteWebhook } from "./webhooks";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({
      id: 1,
      projectId: 10,
      orgId: "org-abc",
      createdBy: "user-1",
      name: "Test View",
      filters: {},
      groupBy: null,
      sortBy: null,
      layoutType: "list",
      isPinned: false,
      visibility: "shared",
      displayOptions: null,
      scope: "project",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    }),
    patch: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn().mockReturnValue({
    data: { isOrgOwner: false, scopes: { "build:workspace:manage": "all", "build:manage": "all" }, modules: {} },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: (fn: () => unknown) => fn,
}));

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrap(client: QueryClient) {
  return function Wrap({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe("useCreateView — invalidation contract (BLD-X-BE-SETTINGS-VIEWS-INV-001)", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates the views list for the correct project after create", async () => {
    const { result } = renderHook(
      () => useCreateView(),
      { wrapper: wrap(client) },
    );

    await act(async () => {
      result.current.mutate({ projectId: 10, name: "New View", layoutType: "list" });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const keys = invalidateSpy.mock.calls.map(
      (call) => JSON.stringify((call[0] as { queryKey?: unknown }).queryKey ?? call[0]),
    );
    const viewsKey = JSON.stringify(buildWorkQueryKeys.projects.views(10));
    expect(keys.some((k) => k === viewsKey)).toBe(true);
  });
});

describe("useDeleteView — invalidation contract (BLD-X-BE-SETTINGS-VIEWS-INV-002)", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates the views list for the correct project after delete", async () => {
    const { result } = renderHook(
      () => useDeleteView(),
      { wrapper: wrap(client) },
    );

    await act(async () => {
      result.current.mutate({ viewId: 99, projectId: 10 });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const keys = invalidateSpy.mock.calls.map(
      (call) => JSON.stringify((call[0] as { queryKey?: unknown }).queryKey ?? call[0]),
    );
    const viewsKey = JSON.stringify(buildWorkQueryKeys.projects.views(10));
    expect(keys.some((k) => k === viewsKey)).toBe(true);
  });
});

describe("useCreateProjectCustomField — invalidation contract (BLD-X-BE-SETTINGS-CF-INV-001)", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (require("@/lib/api-client").apiClient.post as jest.Mock).mockResolvedValue({
      id: 5,
      orgId: "org-abc",
      projectId: 10,
      name: "Sprint Points",
      type: "number",
      options: null,
      required: false,
      position: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
    });
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates the custom-fields list for the correct project after create", async () => {
    const { result } = renderHook(
      () => useCreateProjectCustomField(10),
      { wrapper: wrap(client) },
    );

    await act(async () => {
      result.current.mutate({ name: "Sprint Points", type: "number" });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const keys = invalidateSpy.mock.calls.map(
      (call) => JSON.stringify((call[0] as { queryKey?: unknown }).queryKey ?? call[0]),
    );
    const cfKey = JSON.stringify(buildWorkQueryKeys.projects.customFields(10));
    expect(keys.some((k) => k === cfKey)).toBe(true);
  });
});

describe("useDeleteProjectCustomField — invalidation contract (BLD-X-BE-SETTINGS-CF-INV-002)", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates the custom-fields list for the correct project after delete", async () => {
    const { result } = renderHook(
      () => useDeleteProjectCustomField(10),
      { wrapper: wrap(client) },
    );

    await act(async () => {
      result.current.mutate(7);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const keys = invalidateSpy.mock.calls.map(
      (call) => JSON.stringify((call[0] as { queryKey?: unknown }).queryKey ?? call[0]),
    );
    const cfKey = JSON.stringify(buildWorkQueryKeys.projects.customFields(10));
    expect(keys.some((k) => k === cfKey)).toBe(true);
  });
});

describe("useCreateAgentToken — invalidation contract (BLD-X-BE-SETTINGS-AT-INV-001)", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (require("@/lib/api-client").apiClient.post as jest.Mock).mockResolvedValue({
      token: "slk_abc123",
      id: 1,
      name: "CI Token",
      tokenPrefix: "slk",
      scopes: ["build:read"],
      expiresAt: null,
      createdAt: "2024-01-01T00:00:00.000Z",
    });
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates the org-level agent-tokens list after create — cache is org-scoped not project-scoped", async () => {
    const { result } = renderHook(
      () => useCreateAgentToken(),
      { wrapper: wrap(client) },
    );

    await act(async () => {
      result.current.mutate({ name: "CI Token" });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const keys = invalidateSpy.mock.calls.map(
      (call) => JSON.stringify((call[0] as { queryKey?: unknown }).queryKey ?? call[0]),
    );
    const atKey = JSON.stringify(buildWorkQueryKeys.projects.agentTokens());
    expect(keys.some((k) => k === atKey)).toBe(true);
  });
});

describe("useRevokeAgentToken — invalidation contract (BLD-X-BE-SETTINGS-AT-INV-002)", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates the org-level agent-tokens list after revoke", async () => {
    const { result } = renderHook(
      () => useRevokeAgentToken(),
      { wrapper: wrap(client) },
    );

    await act(async () => {
      result.current.mutate(5);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const keys = invalidateSpy.mock.calls.map(
      (call) => JSON.stringify((call[0] as { queryKey?: unknown }).queryKey ?? call[0]),
    );
    const atKey = JSON.stringify(buildWorkQueryKeys.projects.agentTokens());
    expect(keys.some((k) => k === atKey)).toBe(true);
  });
});

describe("useCreateTransition — invalidation contract (BLD-X-BE-SETTINGS-WF-INV-001)", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (require("@/lib/api-client").apiClient.post as jest.Mock).mockResolvedValue({
      id: 1,
      orgId: "org-abc",
      projectId: 10,
      fromStatusId: null,
      toStatusId: 2,
      name: "Start work",
      requiresApproval: false,
      requiredFields: [],
      allowedRoles: [],
      createdByMembershipId: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      deletedAt: null,
    });
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates the workflow transitions list for the correct project after create", async () => {
    const { result } = renderHook(
      () => useCreateTransition(10),
      { wrapper: wrap(client) },
    );

    await act(async () => {
      result.current.mutate({ toStatusId: 2, name: "Start work" } as never);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const keys = invalidateSpy.mock.calls.map(
      (call) => JSON.stringify((call[0] as { queryKey?: unknown }).queryKey ?? call[0]),
    );
    const wfKey = JSON.stringify(buildWorkQueryKeys.projects.workflow.transitions(10));
    expect(keys.some((k) => k === wfKey)).toBe(true);
  });
});

describe("useDeleteTransition — invalidation contract (BLD-X-BE-SETTINGS-WF-INV-002)", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (require("@/lib/api-client").apiClient.delete as jest.Mock).mockResolvedValue(null);
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates the workflow transitions list for the correct project after delete", async () => {
    const { result } = renderHook(
      () => useDeleteTransition(10),
      { wrapper: wrap(client) },
    );

    await act(async () => {
      result.current.mutate(7);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const keys = invalidateSpy.mock.calls.map(
      (call) => JSON.stringify((call[0] as { queryKey?: unknown }).queryKey ?? call[0]),
    );
    const wfKey = JSON.stringify(buildWorkQueryKeys.projects.workflow.transitions(10));
    expect(keys.some((k) => k === wfKey)).toBe(true);
  });
});

describe("useCreateAutomation — invalidation contract (BLD-X-BE-SETTINGS-AUTO-INV-001)", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (require("@/lib/api-client").apiClient.post as jest.Mock).mockResolvedValue({
      id: 1,
      orgId: "org-abc",
      projectId: 10,
      name: "Auto-assign",
      isActive: true,
      triggerEvent: "ticket.created",
      conditions: [],
      actions: [{ type: "set_assignee", value: "user-abc" }],
      createdBy: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates the automations list for the correct project after create", async () => {
    const { result } = renderHook(
      () => useCreateAutomation(10),
      { wrapper: wrap(client) },
    );

    await act(async () => {
      result.current.mutate({
        name: "Auto-assign",
        isActive: true,
        triggerEvent: "ticket.created",
        conditions: [],
        actions: [{ type: "set_assignee", value: "user-abc" }],
        createdBy: null,
        orgId: "org-abc",
        updatedAt: "2024-01-01T00:00:00.000Z",
      } as never);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const keys = invalidateSpy.mock.calls.map(
      (call) => JSON.stringify((call[0] as { queryKey?: unknown }).queryKey ?? call[0]),
    );
    const autoKey = JSON.stringify(buildWorkQueryKeys.projects.automations(10));
    expect(keys.some((k) => k === autoKey)).toBe(true);
  });
});

describe("useDeleteAutomation — invalidation contract (BLD-X-BE-SETTINGS-AUTO-INV-002)", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (require("@/lib/api-client").apiClient.delete as jest.Mock).mockResolvedValue(null);
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates the automations list for the correct project after delete", async () => {
    const { result } = renderHook(
      () => useDeleteAutomation(10),
      { wrapper: wrap(client) },
    );

    await act(async () => {
      result.current.mutate(3);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const keys = invalidateSpy.mock.calls.map(
      (call) => JSON.stringify((call[0] as { queryKey?: unknown }).queryKey ?? call[0]),
    );
    const autoKey = JSON.stringify(buildWorkQueryKeys.projects.automations(10));
    expect(keys.some((k) => k === autoKey)).toBe(true);
  });
});

describe("useCreateWebhook — invalidation contract (BLD-X-BE-SETTINGS-WH-INV-001)", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (require("@/lib/api-client").apiClient.post as jest.Mock).mockResolvedValue({
      id: 1,
      orgId: "org-abc",
      projectId: 10,
      url: "https://example.com/hook",
      events: ["ticket.created"],
      isActive: true,
      createdAt: "2024-01-01T00:00:00.000Z",
    });
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates the webhooks list for the correct project after create", async () => {
    const { result } = renderHook(
      () => useCreateWebhook(10),
      { wrapper: wrap(client) },
    );

    await act(async () => {
      result.current.mutate({ url: "https://example.com/hook", events: ["ticket.created"] });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const keys = invalidateSpy.mock.calls.map(
      (call) => JSON.stringify((call[0] as { queryKey?: unknown }).queryKey ?? call[0]),
    );
    const whKey = JSON.stringify(buildWorkQueryKeys.projects.webhooks(10));
    expect(keys.some((k) => k === whKey)).toBe(true);
  });
});

describe("useDeleteWebhook — invalidation contract (BLD-X-BE-SETTINGS-WH-INV-002)", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (require("@/lib/api-client").apiClient.delete as jest.Mock).mockResolvedValue(null);
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates the webhooks list for the correct project after delete", async () => {
    const { result } = renderHook(
      () => useDeleteWebhook(10),
      { wrapper: wrap(client) },
    );

    await act(async () => {
      result.current.mutate(9);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const keys = invalidateSpy.mock.calls.map(
      (call) => JSON.stringify((call[0] as { queryKey?: unknown }).queryKey ?? call[0]),
    );
    const whKey = JSON.stringify(buildWorkQueryKeys.projects.webhooks(10));
    expect(keys.some((k) => k === whKey)).toBe(true);
  });
});
