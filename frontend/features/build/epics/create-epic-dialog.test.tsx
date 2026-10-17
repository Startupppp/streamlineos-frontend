import { render, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { CreateEpicInput } from "./epic-schema";

const mockMutateAsync = jest.fn();
let pendingResolve: ((value: unknown) => void) | null = null;
let capturedSubmit: ((data: CreateEpicInput) => void) | null = null;

jest.mock("@/hooks/api/build/tickets", () => ({
  useCreateTicket: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => true,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

jest.mock("@/lib/keyboard-activation", () => ({
  activationProps: () => ({}),
}));

jest.mock("@/components/shared", () => ({
  EntityFormSheet: ({
    onSubmit,
  }: {
    onSubmit: (data: CreateEpicInput) => void;
    children: unknown;
    [key: string]: unknown;
  }) => {
    capturedSubmit = onSubmit;
    return null;
  },
}));

import { CreateEpicDialog } from "./create-epic-dialog";

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

const FORM_DATA: CreateEpicInput = { title: "My Epic", description: "", priority: "MEDIUM" };

beforeEach(() => {
  mockMutateAsync.mockReset();
  pendingResolve = null;
  capturedSubmit = null;
});

it("double submit sends exactly one request while the first is in flight", async () => {
  mockMutateAsync.mockImplementation(
    () => new Promise<unknown>((resolve) => { pendingResolve = resolve; }),
  );

  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  act(() => {
    render(<CreateEpicDialog projectId={10} />, { wrapper: makeWrapper(client) });
  });

  await act(async () => {
    void capturedSubmit!(FORM_DATA);
    void capturedSubmit!(FORM_DATA);
    await Promise.resolve();
  });

  expect(mockMutateAsync).toHaveBeenCalledTimes(1);

  pendingResolve?.(undefined);
  client.clear();
});

it("invalidates the epics query key on success so the list refreshes without a manual reload", async () => {
  mockMutateAsync.mockResolvedValue({});

  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = jest.spyOn(client, "invalidateQueries");

  act(() => {
    render(<CreateEpicDialog projectId={10} />, { wrapper: makeWrapper(client) });
  });

  await act(async () => {
    void capturedSubmit!(FORM_DATA);
    await Promise.resolve();
    await Promise.resolve();
  });

  const epicsKey = buildWorkQueryKeys.projects.epics(10);
  expect(invalidate).toHaveBeenCalledWith(
    expect.objectContaining({ queryKey: epicsKey }),
  );

  client.clear();
});
