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
    expect(screen.getByTestId("confirm-dialog")).toHaveAttribute(
      "data-destructive",
      "true",
    );
  });

  it("sends the record the reviewer picked as the survivor", () => {
    renderDialog(NEWER.partyId);

    fireEvent.click(screen.getByText("Merge records"));

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

    fireEvent.click(screen.getByText(OLDER.name).closest("button")!);
    fireEvent.click(screen.getByText("Merge records"));

    expect(mergeMutate).toHaveBeenCalledWith(
      expect.objectContaining({ preferSurvivorPartyId: OLDER.partyId }),
      expect.anything(),
    );
  });

  it("names both records and never renders a party id", () => {
    const { container } = renderDialog(NEWER.partyId);

    expect(
      screen.getByText(
        `${OLDER.name} will be merged into ${NEWER.name}. Their history, contacts and matched email and phone all move across. This can be undone from Merge history.`,
      ),
    ).toBeInTheDocument();

    expect(container.textContent).not.toContain(OLDER.partyId);
    expect(container.textContent).not.toContain(NEWER.partyId);
  });

  it("tells the reviewer the merge can be undone", () => {
    renderDialog();
    expect(
      screen.getByText(/This can be undone from Merge history/),
    ).toBeInTheDocument();
  });
});
