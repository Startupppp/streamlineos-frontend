import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import type { PurchaseBill } from "@/types/accounting";
import { BillAiSection } from "./bill-ai-section";

installAbortSignalPolyfill();

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

/**
 * `Explain bill spend` reaches `/finance/ai/variance-explain`, a metered endpoint, through
 * `apiClient.post` written inline in this feature rather than through a query hook. It was
 * dispatched with no signal at all, so `AiActionsMenu`'s Stop ended the card and left the
 * paid call running to completion.
 *
 * The proof has to be the signal `fetch` actually received: an assertion on what the action
 * was handed stays green while the client discards it, which is the exact shape of the
 * defect this ticket already found once in `useAskAI`.
 */

const AI_PATH = "/finance/ai/variance-explain";

const originalFetch = globalThis.fetch;
let fetchMock: jest.Mock;
let requestSignal: AbortSignal | null;

function installFetch() {
  requestSignal = null;
  fetchMock = jest.fn((input: unknown, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/auth/session"))
      return Promise.resolve({ ok: false, status: 401 });

    const signal = init?.signal ?? null;
    if (!signal) throw new Error("authedFetch reached global fetch with no signal");
    if (url.includes(AI_PATH)) requestSignal = signal;

    return new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        reject(new DOMException("aborted", "AbortError"));
      });
    });
  });
  Object.assign(globalThis, { fetch: fetchMock });
}

beforeEach(installFetch);

afterAll(() => {
  Object.assign(globalThis, { fetch: originalFetch });
});

const BILL: PurchaseBill = {
  id: 1,
  orgId: "org-1",
  vendorId: 2,
  vendorName: "Vendor",
  billNumber: "BILL-1",
  vendorBillNumber: null,
  billDate: "2026-01-31",
  dueDate: null,
  status: "POSTED",
  subtotal: "1000.00",
  taxAmount: "180.00",
  cgstAmount: "90.00",
  sgstAmount: "90.00",
  igstAmount: "0.00",
  discount: "0.00",
  total: "1180.00",
  amountPaid: "0.00",
  currency: "INR",
  placeOfSupply: null,
  vendorGstin: null,
  supplierGstin: null,
  reverseCharge: false,
  notes: null,
  expenseAccountCode: "5000",
  createdBy: "user-1",
  createdAt: new Date("2026-01-31T00:00:00.000Z"),
  updatedAt: new Date("2026-01-31T00:00:00.000Z"),
  items: [],
};

async function openAndRun(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /AI/i }));
  await user.click(await screen.findByText("Explain bill spend"));
}

async function pressStop(): Promise<void> {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /stop/i }));
}

describe("BillAiSection — Stop cancels the metered call, not just the card", () => {
  it("aborts the signal fetch received when the user presses Stop", async () => {
    render(<BillAiSection bill={BILL} />);
    await openAndRun();

    await waitFor(() => expect(requestSignal).not.toBeNull());
    expect(requestSignal?.aborted).toBe(false);

    await act(async () => {
      await pressStop();
    });

    expect(requestSignal?.aborted).toBe(true);
  });

  it("aborts the outgoing request when the surface unmounts mid-flight", async () => {
    const view = render(<BillAiSection bill={BILL} />);
    await openAndRun();

    await waitFor(() => expect(requestSignal).not.toBeNull());
    expect(requestSignal?.aborted).toBe(false);

    view.unmount();

    await waitFor(() => expect(requestSignal?.aborted).toBe(true));
  });

  // Deliberately NOT a bite proof for the fix: `authedFetch` always supplies a timeout
  // signal, so a `run()` that drops the caller's signal still reaches fetch with one. Only
  // the two tests above — which watch that signal abort — go red when the fix is reverted.
  it("issues exactly one metered request per dispatch, and it carries a signal", async () => {
    render(<BillAiSection bill={BILL} />);
    await openAndRun();

    await waitFor(() => expect(requestSignal).not.toBeNull());
    const aiCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes(AI_PATH),
    );
    expect(aiCalls).toHaveLength(1);
    expect((aiCalls[0]?.[1] as RequestInit | undefined)?.signal).toBeDefined();
  });
});
