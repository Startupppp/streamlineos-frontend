import { act, renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { patchTicketCollections } from "./ticket-cache";
import { useRankTicket } from "./ticket-rank-mutation";

jest.mock("@/lib/api-client", () => ({ apiClient: { patch: jest.fn() } }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true, useAccess: () => ({ data: { isOrgOwner: true }, refetch: jest.fn() }) }));

it("moves the column counts from the source status even when the caller's onMutate already patched the ticket's status", async () => {
  const client = createAppQueryClient();
  const board = buildWorkQueryKeys.projects.tickets({ projectId: 42, view: "board" });
  const counts = buildWorkQueryKeys.projects.columnCounts(42);
  client.setQueryData(board, { data: [{ id: 1, title: "Ticket", rank: "a0", status: "OPEN" }], pagination: { nextCursor: null } });
  client.setQueryData(counts, { OPEN: 2, DONE: 0 });
  jest.mocked(apiClient.patch).mockResolvedValue({ id: 1, rank: "a1", status: "DONE", version: 2 });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useRankTicket({
    onMutate: () => {
      patchTicketCollections(client, 42, (ticket) => (ticket.id === 1 ? { ...ticket, status: "DONE" } : ticket));
      return undefined;
    },
  }), { wrapper });

  await act(async () => {
    await result.current.mutateAsync({ projectId: 42, ticketId: 1, version: 1, status: "DONE", beforeTicketId: null, afterTicketId: null });
  });

  expect(client.getQueryData(counts)).toEqual({ OPEN: 1, DONE: 1 });
  client.clear();
});
