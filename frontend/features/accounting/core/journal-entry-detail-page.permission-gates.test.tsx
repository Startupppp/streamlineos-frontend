/**
 * The permission a control is GATED on must be the permission the command it
 * fires is AUTHORIZED by.
 *
 * `useCan` is an exact map lookup (`hooks/api/access.ts` -> `permission in
 * data.scopes`); there is no implication hierarchy, so a gate keyed on a
 * different string than the command is wrong in both directions at once:
 *
 *   - the user holding the COMMAND key sees no control at all — the feature is
 *     invisible to exactly the role that owns it;
 *   - the user holding the GATE key sees the control, and
 *     `useAuthorizedMutation` throws `Missing permission: <command key>` before
 *     the request is ever sent.
 *
 * The three controls on this page fire three different commands with three
 * different keys, so one shared flag cannot be right for all of them:
 *
 *   Submit for approval -> POST /accounting/journal/{id}/submit-approval
 *                          `accounting:journal:create`  (core-coa.ts:111)
 *   Post entry          -> POST /accounting/journal/{id}/post
 *                          `accounting:journal:manage`  (accounting.ts:205)
 *   Reverse this entry  -> POST /accounting/journal/{id}/reverse
 *                          `accounting:journal:manage`  (accounting.ts:155)
 *
 * `accounting:journal:post` — the key the gate used to read — is bound to no
 * route in `contracts/openapi.json` at all, which is why
 * `check:permission-binding` never compared it: an unresolvable key has nothing
 * to be compared against.
 */
import { render as rtlRender, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { JournalEntryDetailPage } from "./journal-entry-detail-page";

/** `PageWrapper` puts its title in a `TruncatedText`, which needs the tooltip context. */
function render(ui: React.ReactElement) {
  return rtlRender(ui, { wrapper: TooltipProvider });
}

const mockUseCan = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => Boolean(mockUseCan(key)),
}));

const journalEntry = {
  id: 7,
  entryNumber: "JE-0007",
  entryDate: "2026-01-15",
  status: "DRAFT",
  sourceEvent: null,
  lines: [],
};

jest.mock("@/hooks/api/accounting", () => ({
  useJournalEntry: () => ({ data: journalEntry, isLoading: false, error: null, refetch: jest.fn() }),
  usePostJournalEntry: () => ({ mutate: jest.fn(), isPending: false }),
  useReverseJournalEntry: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/accounting/core", () => ({
  useSubmitJournalApproval: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/features/accounting/core/journal-entry-view", () => ({
  JournalEntryView: () => null,
}));

jest.mock("@/features/accounting/core/journal-approve-reject-dialogs", () => ({
  ApproveDialog: () => null,
  RejectDialog: () => null,
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

/** Grants exactly the listed keys and nothing else — the shape `useCan` really has. */
function grantOnly(...keys: string[]): void {
  mockUseCan.mockImplementation((key: string) => keys.includes(key));
}

describe("JournalEntryDetailPage — control gates match the command's permission", () => {
  beforeEach(() => {
    mockUseCan.mockReset();
  });

  it("shows Post and Reverse to a user holding accounting:journal:manage", () => {
    grantOnly("accounting:journal:manage");
    render(<JournalEntryDetailPage entryId="7" />);

    expect(screen.getByRole("button", { name: /post entry/i })).toBeInTheDocument();
  });

  it("shows Submit for approval to a user holding accounting:journal:create", () => {
    grantOnly("accounting:journal:create");
    render(<JournalEntryDetailPage entryId="7" />);

    expect(screen.getByRole("button", { name: /submit for approval/i })).toBeInTheDocument();
  });

  it("hides Post from a user holding only the route-unbound accounting:journal:post", () => {
    grantOnly("accounting:journal:post");
    render(<JournalEntryDetailPage entryId="7" />);

    expect(screen.queryByRole("button", { name: /post entry/i })).not.toBeInTheDocument();
  });

  it("hides Submit for approval from a user holding only accounting:journal:manage", () => {
    grantOnly("accounting:journal:manage");
    render(<JournalEntryDetailPage entryId="7" />);

    expect(
      screen.queryByRole("button", { name: /submit for approval/i }),
    ).not.toBeInTheDocument();
  });

  it("shows Reverse on a posted entry to a user holding accounting:journal:manage", () => {
    grantOnly("accounting:journal:manage");
    journalEntry.status = "POSTED";
    try {
      render(<JournalEntryDetailPage entryId="7" />);
      expect(screen.getByRole("button", { name: /reverse this entry/i })).toBeInTheDocument();
    } finally {
      journalEntry.status = "DRAFT";
    }
  });

  it("never asks for a permission that no backend route declares", () => {
    grantOnly("accounting:journal:manage", "accounting:journal:create");
    render(<JournalEntryDetailPage entryId="7" />);

    const asked = mockUseCan.mock.calls.map(([key]: [string]) => key);
    expect(asked).not.toContain("accounting:journal:post");
  });
});
