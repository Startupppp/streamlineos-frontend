"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import type { PropsWithChildren, ReactNode } from "react";
import { PartyMergeDialog } from "./party-merge-dialog";
import type { DuplicateCandidateSide } from "@/types/party/merges";

const mergeMutate = jest.fn();

jest.mock("@/hooks/api/party/merges", () => ({
  useMergeParties: () => ({ mutate: mergeMutate, isPending: false }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

/**
 * The confirm shell is rendered flat.
 *
 * `ConfirmDialog` is a Radix `AlertDialog`, which portals and traps focus; what
 * this file is about is which party id the dialog decides to keep, and that
 * decision is made before anything is portalled.
 */
jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    title,
    description,
    content,
    confirmLabel,
    destructive,
    onConfirm,
  }: {
    title: ReactNode;
    description: ReactNode;
    content?: ReactNode;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
  }) => (
    <div data-testid="confirm-dialog" data-destructive={String(Boolean(destructive))}>
      <h2>{title}</h2>
      <p>{description}</p>
      {content}
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

const OLDER: DuplicateCandidateSide = {
  partyId: "11111111-1111-4111-8111-111111111111",
  name: "Kadambari Textiles (old)",
  email: "ops@kadambari.example",
  phone: null,
  partyKind: "ORGANISATION",
  createdAt: "2024-01-01T00:00:00.000Z",
};

const NEWER: DuplicateCandidateSide = {
  partyId: "22222222-2222-4222-8222-222222222222",
  name: "Kadambari Textiles",
  email: null,
  phone: "+91 9876543210",
  partyKind: "ORGANISATION",
  createdAt: "2025-06-01T00:00:00.000Z",
};

function renderDialog(defaultSurvivorPartyId?: string) {
  return render(
    <PartyMergeDialog
      pair={{ left: OLDER, right: NEWER }}
      open
      onOpenChange={jest.fn()}
      defaultSurvivorPartyId={defaultSurvivorPartyId}
    />,
  );
}

describe("PartyMergeDialog", () => {
  beforeEach(() => mergeMutate.mockClear());

  it("is a destructive confirmation, not a plain dialog with a red button", () => {
    renderDialog();
    /**
     * §13: a merge is irreversible-shaped and lifecycle-shaped, so it takes
     * `ConfirmDialog destructive` whatever its field count. Asserted here
     * because the surface it replaced escalated a `Dialog` into a second
     * `AlertDialog` to get the same effect, and the two disagreed about which
     * one owned the pending state.
     */
    expect(screen.getByTestId("confirm-dialog")).toHaveAttribute(
      "data-destructive",
      "true",
    );
  });

  it("sends the record the reviewer picked as the survivor", () => {
    renderDialog(NEWER.partyId);

    fireEvent.click(screen.getByText("Merge records"));

    /**
     * The whole point of `preferSurvivorPartyId`.
     *
     * `chooseSurvivor` on the server keeps the OLDER party when nothing says
     * otherwise, and `OLDER` here is exactly that — so a payload without this
     * field would silently keep the record the reviewer did not choose, and
     * every field conflict would resolve in its favour.
     */
    expect(mergeMutate).toHaveBeenCalledWith(
      {
        leftPartyId: OLDER.partyId,
        rightPartyId: NEWER.partyId,
        preferSurvivorPartyId: NEWER.partyId,
      },
      expect.anything(),
    );
  });

  it("follows the reviewer when they change their mind", () => {
    renderDialog(NEWER.partyId);

    /** The cards are the control; picking one is what sets the survivor. */
    fireEvent.click(screen.getByText(OLDER.name).closest("button")!);
    fireEvent.click(screen.getByText("Merge records"));

    expect(mergeMutate).toHaveBeenCalledWith(
      expect.objectContaining({ preferSurvivorPartyId: OLDER.partyId }),
      expect.anything(),
    );
  });

  it("names both records and never renders a party id", () => {
    const { container } = renderDialog(NEWER.partyId);

    /** The description says which way round it goes, in names. */
    expect(
      screen.getByText(
        `${OLDER.name} will be merged into ${NEWER.name}. Their history, contacts and matched email and phone all move across. This can be undone from Merge history.`,
      ),
    ).toBeInTheDocument();

    /**
     * §5: a visible UUID is a bug. The ids travel in the payload and in
     * `aria-pressed` state, never as text — a reader deciding whether to destroy
     * a customer record learns nothing from one.
     */
    expect(container.textContent).not.toContain(OLDER.partyId);
    expect(container.textContent).not.toContain(NEWER.partyId);
  });

  it("tells the reviewer the merge can be undone", () => {
    renderDialog();
    /**
     * The offer has to be in the dialog, not only in the toast that follows it:
     * somebody about to fuse two customers decides on what this screen says.
     */
    expect(
      screen.getByText(/This can be undone from Merge history/),
    ).toBeInTheDocument();
  });
});
