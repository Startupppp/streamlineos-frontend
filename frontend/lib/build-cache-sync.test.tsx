import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createAppQueryClient, QueryProvider } from "@/components/providers/query-provider";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useProjectCustomFields, useTicketCustomFieldValues } from "@/hooks/api/build/custom-fields";
import { useAutomations } from "@/hooks/api/build/automations";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "./query-keys/build-work";
import { accountingAndSupportQueryKeys } from "./query-keys/accounting-and-support";
import { authenticatedScope } from "./query-scope";
import { subscribeBuildCacheSync } from "./build-cache-sync";

let mockOrgId = "org-a";
jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn(async () => []) } }));
jest.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated", data: { orgId: mockOrgId, user: { id: "member-a" } } }),
}));
jest.mock("@/lib/dom-mutation-guard", () => ({}));
jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { isOrgOwner: true }, refetch: jest.fn() }),
}));

class TabChannel extends EventTarget {
  static channels = new Set<TabChannel>();
  static sent: unknown[] = [];

  constructor(readonly name: string) {
    super();
    TabChannel.channels.add(this);
  }

  postMessage(data: unknown) {
    TabChannel.sent.push(data);
    for (const peer of TabChannel.channels)
      if (peer !== this && peer.name === this.name)
        peer.dispatchEvent(new MessageEvent("message", { data }));
  }

  close() {
    TabChannel.channels.delete(this);
  }
}

const scope = authenticatedScope("org-a", "member-a");
const cleanups: (() => void)[] = [];
const originalChannel = Object.getOwnPropertyDescriptor(globalThis, "BroadcastChannel");

beforeEach(() => {
  Object.defineProperty(globalThis, "BroadcastChannel", { value: TabChannel, configurable: true });
  TabChannel.sent = [];
  mockOrgId = "org-a";
});

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  TabChannel.channels.clear();
  jest.restoreAllMocks();
  if (originalChannel) Object.defineProperty(globalThis, "BroadcastChannel", originalChannel);
  else Reflect.deleteProperty(globalThis, "BroadcastChannel");
});

function connect(clientScope = scope) {
  const client = createAppQueryClient(clientScope);
  const stop = subscribeBuildCacheSync(client, clientScope);
  cleanups.push(() => { stop(); client.clear(); });
  return { client, stop };
}

function mutationIn(client: ReturnType<typeof createAppQueryClient>, fail = false, onSuccess?: () => void) {
  let savedTitle = "Before";
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  const mutation = renderHook(() => useAuthorizedMutation("build:tickets:update", {
    mutationKey: ["projects", "tickets", "update"],
    onSuccess,
    mutationFn: async () => {
      if (fail) throw new Error("Save failed");
      savedTitle = "After";
      return savedTitle;
    },
  }), { wrapper: Wrapper });
  cleanups.push(mutation.unmount);
  return { mutation, read: () => savedTitle };
}

it("tab B refetches a successful Build mutation with no matching cache entry in tab A and no echo", async () => {
  const tabA = connect();
  const tabB = connect();
  const { mutation, read } = mutationIn(tabA.client);
  const queryKey = buildWorkQueryKeys.projects.ticket(9, 42);
  const queryFn = jest.fn(async () => read());
  const observer = new QueryObserver(tabB.client, { queryKey, queryFn, staleTime: Infinity });
  cleanups.push(observer.subscribe(() => {}));
  await waitFor(() => expect(observer.getCurrentResult().data).toBe("Before"));

  await act(async () => { await mutation.result.current.mutateAsync(); });

  await waitFor(() => expect(observer.getCurrentResult().data).toBe("After"));
  expect(queryFn).toHaveBeenCalledTimes(2);
  expect(tabA.client.getQueryData(queryKey)).toBeUndefined();
  expect(TabChannel.sent).toEqual(["build:changed"]);
});

it("marks inactive Build and report caches stale without touching another tenant, user, or module", async () => {
  const tabA = connect();
  const tabB = connect();
  const otherOrg = connect(authenticatedScope("org-b", "member-a"));
  const otherUser = connect(authenticatedScope("org-a", "member-b"));
  const ticketKey = buildWorkQueryKeys.projects.ticket(9, 42);
  const reportKey = buildWorkQueryKeys.projectReports.velocity(9);
  const unrelatedKey = accountingAndSupportQueryKeys.accounting.all;
  for (const { client } of [tabB, otherOrg, otherUser]) {
    client.setQueryData(ticketKey, "Before");
    client.setQueryData(reportKey, "Before");
    client.setQueryData(unrelatedKey, "Before");
  }
  const { mutation } = mutationIn(tabA.client);

  await act(async () => { await mutation.result.current.mutateAsync(); });

  expect(tabB.client.getQueryState(ticketKey)?.isInvalidated).toBe(true);
  expect(tabB.client.getQueryState(reportKey)?.isInvalidated).toBe(true);
  expect(tabB.client.getQueryState(unrelatedKey)?.isInvalidated).toBe(false);
  expect(otherOrg.client.getQueryState(ticketKey)?.isInvalidated).toBe(false);
  expect(otherUser.client.getQueryState(ticketKey)?.isInvalidated).toBe(false);
});

it("refetches peer custom-field definitions, ticket values and project automations through their actual hooks", async () => {
  const tabA = connect();
  const tabB = connect();
  const { mutation } = mutationIn(tabA.client);
  const get = jest.mocked(apiClient.get);
  get.mockClear();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={tabB.client}>{children}</QueryClientProvider>;
  }
  const queries = renderHook(() => ({
    fields: useProjectCustomFields(9),
    values: useTicketCustomFieldValues(9, 42),
    automations: useAutomations(9),
  }), { wrapper: Wrapper });
  cleanups.push(queries.unmount);
  await waitFor(() => expect(Object.values(queries.result.current).every(query => query.isSuccess)).toBe(true));
  expect(get).toHaveBeenCalledTimes(3);

  await act(async () => { await mutation.result.current.mutateAsync(); });

  await waitFor(() => expect(get).toHaveBeenCalledTimes(6));
  for (const query of tabB.client.getQueryCache().getAll())
    expect(query.queryKey.slice(0, 2)).toEqual(buildWorkQueryKeys.projects.all);
});

it("does not signal a failed mutation or receive messages after provider cleanup", async () => {
  const tabA = connect();
  const tabB = connect();
  const queryKey = buildWorkQueryKeys.projects.ticket(9, 42);
  tabB.client.setQueryData(queryKey, "Before");
  const failed = mutationIn(tabA.client, true);
  await act(async () => {
    await expect(failed.mutation.result.current.mutateAsync()).rejects.toThrow("Save failed");
  });
  expect(TabChannel.sent).toEqual([]);
  tabB.stop();
  const successful = mutationIn(tabA.client);
  await act(async () => { await successful.mutation.result.current.mutateAsync(); });
  expect(tabB.client.getQueryState(queryKey)?.isInvalidated).toBe(false);
});

it("ignores invalid payloads and unauthenticated scopes", () => {
  const tab = connect();
  connect("unauthenticated");
  connect(authenticatedScope("", "member-a"));
  expect(TabChannel.channels.size).toBe(1);
  const queryKey = buildWorkQueryKeys.projects.ticket(9, 42);
  tab.client.setQueryData(queryKey, "Before");
  for (const channel of TabChannel.channels)
    channel.dispatchEvent(new MessageEvent("message", { data: { ticket: "untrusted" } }));
  expect(tab.client.getQueryState(queryKey)?.isInvalidated).toBe(false);
});

it("uses storage events when BroadcastChannel is unavailable and survives denied storage", async () => {
  Object.defineProperty(globalThis, "BroadcastChannel", { value: undefined, configurable: true });
  const tab = connect();
  const queryKey = buildWorkQueryKeys.projects.ticket(9, 42);
  tab.client.setQueryData(queryKey, "Before");
  const key = `streamlineos:build-cache:${scope}`;
  window.dispatchEvent(new StorageEvent("storage", { key, newValue: "build:changed" }));
  expect(tab.client.getQueryState(queryKey)?.isInvalidated).toBe(true);
  const write = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Storage denied", "SecurityError");
  });
  const { mutation } = mutationIn(tab.client);
  await act(async () => { await mutation.result.current.mutateAsync(); });
  expect(write).toHaveBeenCalledWith(key, "build:changed");
  await waitFor(() => expect(mutation.result.current.data).toBe("After"));
});

it("throttles focus and visibility refreshes to active Build queries when BroadcastChannel exists", async () => {
  const tab = connect();
  const buildKey = buildWorkQueryKeys.projects.ticket(9, 42);
  const unrelatedKey = accountingAndSupportQueryKeys.accounting.all;
  const buildQueryFn = jest.fn(async () => "Build");
  const unrelatedQueryFn = jest.fn(async () => "Accounting");
  const buildObserver = new QueryObserver(tab.client, {
    queryKey: buildKey,
    queryFn: buildQueryFn,
    staleTime: Infinity,
  });
  const unrelatedObserver = new QueryObserver(tab.client, {
    queryKey: unrelatedKey,
    queryFn: unrelatedQueryFn,
    staleTime: Infinity,
  });
  cleanups.push(buildObserver.subscribe(() => {}));
  cleanups.push(unrelatedObserver.subscribe(() => {}));
  await waitFor(() => expect(buildQueryFn).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(unrelatedQueryFn).toHaveBeenCalledTimes(1));
  expect(TabChannel.channels.size).toBe(1);
  const now = jest.spyOn(Date, "now").mockReturnValue(20_000);
  jest.spyOn(document, "visibilityState", "get").mockReturnValue("visible");

  window.dispatchEvent(new Event("focus"));

  await waitFor(() => expect(buildQueryFn).toHaveBeenCalledTimes(2));
  expect(unrelatedQueryFn).toHaveBeenCalledTimes(1);

  now.mockReturnValue(20_001);
  document.dispatchEvent(new Event("visibilitychange"));
  await act(async () => {});
  expect(buildQueryFn).toHaveBeenCalledTimes(2);

  now.mockReturnValue(35_001);
  document.dispatchEvent(new Event("visibilitychange"));
  await waitFor(() => expect(buildQueryFn).toHaveBeenCalledTimes(3));
  expect(unrelatedQueryFn).toHaveBeenCalledTimes(1);
});

it("notifies peers when the server commits but a local success callback throws", async () => {
  const tabA = connect();
  const tabB = connect();
  const queryKey = buildWorkQueryKeys.projects.ticket(9, 42);
  tabA.client.setQueryData(queryKey, "Before");
  tabB.client.setQueryData(queryKey, "Before");
  const { mutation, read } = mutationIn(tabA.client, false, () => { throw new Error("UI callback failed"); });

  await act(async () => {
    await expect(mutation.result.current.mutateAsync()).rejects.toThrow("UI callback failed");
  });

  expect(read()).toBe("After");
  expect(tabB.client.getQueryState(queryKey)?.isInvalidated).toBe(true);
  expect(tabA.client.getQueryState(queryKey)?.isInvalidated).toBe(false);
  expect(TabChannel.sent).toEqual(["build:changed"]);
});

it("falls back to storage when the browser refuses to open a channel", async () => {
  Object.defineProperty(globalThis, "BroadcastChannel", {
    configurable: true,
    value: jest.fn(() => { throw new DOMException("Channel denied", "SecurityError"); }),
  });
  const sender = connect();
  const write = jest.spyOn(Storage.prototype, "setItem");
  const { mutation } = mutationIn(sender.client);
  await act(async () => { await mutation.result.current.mutateAsync(); });
  expect(write).toHaveBeenCalledWith(`streamlineos:build-cache:${scope}`, "build:changed");
});

it.each(["unmount", "scope-switch"])("notifies the original scope after sender %s with a mutation in flight", async (change) => {
  const originalPeer = connect();
  const nextOrgPeer = connect(authenticatedScope("org-b", "member-a"));
  const queryKey = buildWorkQueryKeys.projects.ticket(9, 42);
  originalPeer.client.setQueryData(queryKey, "Before");
  nextOrgPeer.client.setQueryData(queryKey, "Before");
  let commit = () => {};
  const pendingCommit = new Promise<void>((resolve) => { commit = resolve; });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryProvider>{children}</QueryProvider>;
  }
  const sender = renderHook(() => useAuthorizedMutation("build:tickets:update", {
    mutationKey: ["projects", "tickets", "update"],
    mutationFn: () => pendingCommit,
  }), { wrapper: Wrapper });
  cleanups.push(sender.unmount);
  let pendingMutation: Promise<void> = Promise.resolve();
  await act(async () => { pendingMutation = sender.result.current.mutateAsync(); });
  await waitFor(() => expect(sender.result.current.isPending).toBe(true));

  if (change === "unmount") sender.unmount();
  else {
    mockOrgId = "org-b";
    sender.rerender();
  }
  await act(async () => { commit(); await pendingMutation; });

  expect(originalPeer.client.getQueryState(queryKey)?.isInvalidated).toBe(true);
  expect(nextOrgPeer.client.getQueryState(queryKey)?.isInvalidated).toBe(false);
  expect(TabChannel.sent).toEqual(["build:changed"]);
});

it("a private draft autosave does not make every other tab refetch the Build cache", async () => {
  const tabA = connect();
  const tabB = connect();
  const queryKey = buildWorkQueryKeys.projects.ticket(9, 42);
  tabB.client.setQueryData(queryKey, "Before");
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={tabA.client}>{children}</QueryClientProvider>;
  }
  const draft = renderHook(() => useAuthorizedMutation("build:tickets:view", {
    meta: { buildCacheSync: false },
    mutationKey: ["projects", "comment-drafts", "upsert"],
    mutationFn: async () => "saved",
  }), { wrapper: Wrapper });
  cleanups.push(draft.unmount);

  await act(async () => { await draft.result.current.mutateAsync(); });

  expect(TabChannel.sent).toEqual([]);
  expect(tabB.client.getQueryState(queryKey)?.isInvalidated).toBe(false);
});
