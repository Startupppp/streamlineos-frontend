import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api-envelope";
import type { AiTextStreamRequest, AiTextStreamResult } from "@/hooks/api/ai-text-stream";
import ExecutiveBriefPage from "./executive-brief-page";

type StreamInput = Pick<AiTextStreamRequest, "signal" | "onToken" | "onHeaders">;
let request: StreamInput | undefined;
let finish: ((result: AiTextStreamResult) => void) | undefined;
let fail: ((error: Error) => void) | undefined;
let canGenerate = true;
const generate = jest.fn((input: StreamInput) => {
  request = input;
  return new Promise<AiTextStreamResult>((resolve, reject) => {
    finish = resolve;
    fail = reject;
  });
});
const success = jest.fn();

jest.mock("sonner", () => ({ toast: { success: (...args: unknown[]) => success(...args) } }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => canGenerate }));
jest.mock("@/lib/api/hooks/executive-brief", () => ({
  ...jest.requireActual("@/lib/api/hooks/executive-brief"),
  useExecutiveBrief: () => ({ data: { snapshot: null, isStale: false }, isLoading: false, isError: false }),
  useGenerateBrief: () => useMutation({ mutationFn: generate, retry: false }),
}));

function mount() {
  const client = createAppQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider><ExecutiveBriefPage /></TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  request = undefined;
  finish = undefined;
  fail = undefined;
  canGenerate = true;
  generate.mockClear();
  success.mockClear();
});

it("shows pending immediately, incremental text and citations before completion", async () => {
  mount();
  await userEvent.click(screen.getByRole("button", { name: "Generate Brief" }));
  expect(screen.getByText("Generating your brief…")).toBeInTheDocument();
  act(() => {
    request?.onHeaders?.(new Headers({ "x-ai-sources": encodeURIComponent(JSON.stringify([{ id: "build", title: "Project Health", href: "/build" }])) }));
    request?.onToken?.("Projects are progressing.");
  });
  expect(screen.getByText("Projects are progressing.")).toBeInTheDocument();
  expect(screen.getByRole("link")).toHaveAttribute("href", "/build");
  expect(success).not.toHaveBeenCalled();
  await act(async () => finish?.({ status: "completed", text: "Projects are progressing.", headers: new Headers() }));
  expect(success).toHaveBeenCalledTimes(1);
});

it("cancels, preserves partial text, and ignores late tokens", async () => {
  mount();
  await userEvent.click(screen.getByRole("button", { name: "Generate Brief" }));
  act(() => request?.onToken?.("Partial draft"));
  await userEvent.click(screen.getByRole("button", { name: "Stop generating" }));
  expect(request?.signal?.aborted).toBe(true);
  act(() => request?.onToken?.(" stale token"));
  await act(async () => finish?.({ status: "cancelled", text: "Partial draft" }));
  expect(screen.getByText("Partial draft")).toBeInTheDocument();
  expect(screen.queryByText(/stale token/)).not.toBeInTheDocument();
  expect(screen.getByText(/Generation stopped/)).toBeInTheDocument();
  expect(success).not.toHaveBeenCalled();
});

it("retains partial output on provider failure and does not auto retry", async () => {
  mount();
  await userEvent.click(screen.getByRole("button", { name: "Generate Brief" }));
  act(() => request?.onToken?.("Partial draft"));
  await act(async () => fail?.(new ApiError("Provider failed", 503, "AI_PROVIDER_UNAVAILABLE")));
  await waitFor(() => expect(screen.getByText(/Generation interrupted/)).toBeInTheDocument());
  expect(screen.getByText("Partial draft")).toBeInTheDocument();
  expect(generate).toHaveBeenCalledTimes(1);
  expect(success).not.toHaveBeenCalled();
});

it("aborts an unmounted view and hides generation without permission", async () => {
  const view = mount();
  await userEvent.click(screen.getByRole("button", { name: "Generate Brief" }));
  view.unmount();
  expect(request?.signal?.aborted).toBe(true);
  await act(async () => finish?.({ status: "cancelled", text: "" }));
  canGenerate = false;
  mount();
  expect(screen.queryByRole("button", { name: "Generate Brief" })).not.toBeInTheDocument();
});
