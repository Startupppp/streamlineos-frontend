import { renderHook } from "@testing-library/react";
import { useMailInboxSummarySheet } from "./use-mail-inbox-summary";

const mutation = {
  variables: { accountId: 7 }, isPending: false, isError: false, isSuccess: true,
  data: { summary: "Account seven only", highlights: [], actionItems: [] },
  reset: jest.fn(), mutateAsync: jest.fn(),
};

jest.mock("@/hooks/api/mail", () => ({ useMailInboxSummary: () => mutation }));

it("never shows another selected account's brief or loading state", () => {
  const { result, rerender } = renderHook(({ accountId }) => useMailInboxSummarySheet(accountId), { initialProps: { accountId: 7 } });
  expect(result.current.summaryState).toMatchObject({ status: "ready", summary: "Account seven only" });
  rerender({ accountId: 8 });
  expect(result.current.summaryState).toEqual({ status: "idle" });
  mutation.isPending = true;
  rerender({ accountId: 8 });
  expect(result.current.summaryState).toEqual({ status: "idle" });
});
