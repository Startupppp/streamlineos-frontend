import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const mockMutate = jest.fn();

jest.mock("@/hooks/api/build/tickets", () => ({
  useCreateTicket: () => ({ mutate: mockMutate, isPending: false }),
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
    onSubmit: (data: { title: string; description: string; priority: string }) => void;
    children: unknown;
    [key: string]: unknown;
  }) => {
    onSubmit({ title: "My Epic", description: "", priority: "MEDIUM" });
    return null;
  },
}));

import { CreateEpicDialog } from "./create-epic-dialog";

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

it("invalidates the epics query key on success so the list refreshes without a manual reload", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = jest.spyOn(client, "invalidateQueries");

  render(<CreateEpicDialog projectId={10} />, { wrapper: makeWrapper(client) });

  expect(mockMutate).toHaveBeenCalledTimes(1);
  const onSuccessCallback = mockMutate.mock.calls[0]?.[1]?.onSuccess as (() => void) | undefined;
  expect(onSuccessCallback).toBeDefined();

  onSuccessCallback!();

  const epicsKey = buildWorkQueryKeys.projects.epics(10);
  expect(invalidate).toHaveBeenCalledWith(
    expect.objectContaining({ queryKey: epicsKey }),
  );

  client.clear();
});
