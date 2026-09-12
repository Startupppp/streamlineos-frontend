"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import type { PropsWithChildren, ReactNode } from "react";
import { MergeHistoryPanel } from "./merge-history-panel";
import type { PartyMergeRecord } from "@/types/party/merges";

const revertMutate = jest.fn();
let merges: { data: PartyMergeRecord[]; pagination: { page: number; limit: number; total: number } };

jest.mock("@/hooks/api/party/merges", () => ({
  usePartyMerges: () => ({
    data: merges,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    access: { allowed: true, state: "allowed" },
  }),
  useRevertPartyMerge: () => ({ mutate: revertMutate, isPending: false }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    title,
    description,
    confirmLabel,
    destructive,
    onConfirm,
  }: {
    title: ReactNode;
    description: ReactNode;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
  }) => (
    <div data-testid="revert-confirm" data-destructive={String(Boolean(destructive))}>
      <h2>{title}</h2>
      <p>{description}</p>
      <button type="button" onClick={onConfirm}>
        {confirmLabel}
      </button>
    </div>
  ),
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text, className }: { text: string; className?: string }) => (
    <span className={className}>{text}</span>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));

const REVERSIBLE: PartyMergeRecord = {
  partyMergeId: "merge-1",
  survivorPartyId: "party-a",
  survivorName: "Kadambari Textiles",
  mergedPartyId: "party-b",
  mergedName: "Kadambari Textiles (old)",
  decidedBy: "USER",
  decidedByUserId: "user-1",
  confidence: 0.72,
  conflictFields: ["email"],
  mergedAt: "2026-09-01T10:00:00.000Z",
  revertedAt: null,
};

const ALREADY_UNDONE: PartyMergeRecord = {
  ...REVERSIBLE,
  partyMergeId: "merge-2",
  survivorName: "Sundar Exports",
  mergedName: "Sundar Exports Pvt",
  decidedBy: "SYSTEM",
  decidedByUserId: null,
  revertedAt: "2026-09-02T10:00:00.000Z",
};

describe("MergeHistoryPanel", () => {
  beforeEach(() => {
    revertMutate.mockClear();
    merges = {
      data: [REVERSIBLE, ALREADY_UNDONE],
      pagination: { page: 1, limit: 10, total: 2 },
    };
  });

  it("offers to undo a merge long after the toast that announced it", () => {
    /**
     * The reason `GET /party/merges` exists. `party_merges` always held the
     * snapshot a revert needs and nothing read it, so a merge could only be
     * undone in the moment — which for the merges the system performs
     * unattended meant never.
     */
    render(<MergeHistoryPanel />);

    const undo = screen.getAllByText("Undo");
    expect(undo).toHaveLength(1);

    fireEvent.click(undo[0]!);
    fireEvent.click(screen.getByText("Undo merge"));

    expect(revertMutate).toHaveBeenCalledWith("merge-1", expect.anything());
  });

  it("confirms destructively, naming what comes back", () => {
    render(<MergeHistoryPanel />);
    fireEvent.click(screen.getAllByText("Undo")[0]!);

    const dialog = screen.getByTestId("revert-confirm");
    expect(dialog).toHaveAttribute("data-destructive", "true");
    expect(dialog.textContent).toContain("Kadambari Textiles (old)");
    expect(dialog.textContent).toContain("Kadambari Textiles");
  });

  it("shows an already-undone merge without offering to undo it again", () => {
    /**
     * `revert` selects on `reverted_at IS NULL`, so a second attempt 404s.
     * Listing the row anyway is deliberate: "this was already undone" is the
     * answer to the question that brings somebody here, and hiding it would send
     * them looking for a merge that is no longer in the list.
     */
    render(<MergeHistoryPanel />);

    expect(screen.getByText("Undone")).toBeInTheDocument();
    expect(screen.getByText("Sundar Exports Pvt")).toBeInTheDocument();
    expect(screen.getAllByText("Undo")).toHaveLength(1);
  });

  it("marks a merge nobody was asked about", () => {
    /**
     * `decidedBy: SYSTEM` is the case the snapshot exists for — an automatic
     * destructive operation with no toast and no confirmation, so the ledger is
     * the only place it is ever visible.
     */
    render(<MergeHistoryPanel />);
    expect(screen.getByText("Automatic")).toBeInTheDocument();
  });

  it("says nothing has been merged rather than showing an empty box", () => {
    merges = { data: [], pagination: { page: 1, limit: 10, total: 0 } };
    render(<MergeHistoryPanel />);
    expect(screen.getByText("Nothing merged yet")).toBeInTheDocument();
  });
});
