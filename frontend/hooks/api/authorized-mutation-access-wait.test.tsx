import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthorizedMutation } from "./authorized-mutation";

const send = jest.fn(() => Promise.resolve("saved"));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  useAccess: () => ({ data: undefined, refetch: () => new Promise(() => undefined) }),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

it("fails within the access wait instead of waiting on an access read for ever", async () => {
  jest.useFakeTimers();
  const { result } = renderHook(
    () => useAuthorizedMutation("settings:manage", { mutationKey: ["probe"], mutationFn: send }),
    { wrapper },
  );

  act(() => result.current.mutate());
  await act(() => jest.advanceTimersByTimeAsync(5_010));

  expect(result.current.status).toBe("error");
  expect(result.current.error?.message).toBe("We couldn't confirm your access. Please try again.");
  expect(send).not.toHaveBeenCalled();
  jest.useRealTimers();
});
