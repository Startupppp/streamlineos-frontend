import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import { useEvidenceThemes, useOpportunity, useOutcomeReviews } from "./product-discovery";

jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

// MP-B-008: a failed Insights widget read must stay inline, not take the
// product route to its error boundary.
const READS: Array<[string, () => { isError: boolean }]> = [
  ["opportunity pane", () => useOpportunity(7, 99)],
  ["evidence themes", () => useEvidenceThemes(7, {})],
  ["outcome reviews", () => useOutcomeReviews(7, {})],
];

it.each(READS)("keeps a failed %s read inline", async (_name, useRead) => {
  jest.mocked(apiClient.get).mockRejectedValue(new ApiError("Not found", 404, "NOT_FOUND"));
  const client = createAppQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(useRead, { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
  client.clear();
});
