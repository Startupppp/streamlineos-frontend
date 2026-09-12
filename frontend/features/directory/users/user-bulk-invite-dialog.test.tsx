import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * P2's acceptance is about what the operator can SEE and DO after a batch only
 * half worked. The dialog used to collapse every outcome into one success toast,
 * so a plan-limit rejection and a forbidden domain were indistinguishable from a
 * delivered invitation, and the only way back was to retype the whole paste —
 * which re-invited everyone who had already succeeded.
 */

interface BulkRow {
  email: string;
  originalEmail: string;
  success: boolean;
  invitationId?: string;
  isDuplicate?: boolean;
  error?: string;
}

interface BulkResponse {
  deliveryMode: "background" | "enqueue";
  results: BulkRow[];
}

type BulkVariables = { emails: string[]; role: string };
type BulkHandlers = {
  onSuccess?: (data: BulkResponse) => void;
  onError?: (error: Error) => void;
};

const mutate = jest.fn();
let isPending = false;

jest.mock("@/hooks/api/users", () => ({
  useBulkInviteUsers: () => ({ mutate, isPending }),
}));

const toastSuccess = jest.fn();
const toastError = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    success: (message: string) => toastSuccess(message),
    error: (message: string) => toastError(message),
  },
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: ReactNode;
    onValueChange: (value: string) => void;
  }) => {
    function handleClick() {
      onValueChange("MEMBER");
    }
    return (
      <div>
        <button type="button" onClick={handleClick}>
          Choose Member role
        </button>
        {children}
      </div>
    );
  },
  SelectContent: () => null,
  SelectItem: () => null,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>role</span>,
}));

import { UserBulkInviteDialog } from "./user-bulk-invite-dialog";

function renderDialog() {
  const onOpenChange = jest.fn();
  const utils = render(<UserBulkInviteDialog open onOpenChange={onOpenChange} />);
  return { ...utils, onOpenChange };
}

function emailsBox(): HTMLTextAreaElement {
  const box = screen.getByPlaceholderText(/alice@company\.com/);
  if (!(box instanceof HTMLTextAreaElement)) throw new Error("emails field is not a textarea");
  return box;
}

function typeEmails(value: string): void {
  fireEvent.change(emailsBox(), { target: { value } });
}

function chooseRole(): void {
  fireEvent.click(screen.getByRole("button", { name: "Choose Member role" }));
}

function submit(): void {
  fireEvent.click(screen.getByRole("button", { name: /Invite \d+ user|Send invitations/ }));
}

function lastSubmission(): { variables: BulkVariables; handlers: BulkHandlers } {
  const call = mutate.mock.calls[mutate.mock.calls.length - 1];
  if (!call) throw new Error("the bulk invite mutation was never called");
  return { variables: call[0] as BulkVariables, handlers: call[1] as BulkHandlers };
}

function resolveWith(results: BulkRow[]): void {
  const { handlers } = lastSubmission();
  handlers.onSuccess?.({ deliveryMode: "background", results });
}

beforeEach(() => {
  mutate.mockClear();
  toastSuccess.mockClear();
  toastError.mockClear();
  isPending = false;
});

afterEach(cleanup);

describe("UserBulkInviteDialog — duplicate preview before submission", () => {
  it("counts mixed case and whitespace variants as one recipient", async () => {
    renderDialog();
    typeEmails("Alice@Example.com\n  alice@example.COM  \nALICE@example.com\nbob@example.com");

    expect(await screen.findByText("(2 unique, 2 duplicates)")).toBeInTheDocument();
    expect(
      screen.getByText("Duplicate entries will be collapsed to a single invitation each."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invite 2 users" })).toBeInTheDocument();
  });

  it("shows no duplicate warning when every address is distinct", async () => {
    renderDialog();
    typeEmails("alice@example.com, bob@example.com");

    expect(await screen.findByText("(2 unique)")).toBeInTheDocument();
    expect(
      screen.queryByText("Duplicate entries will be collapsed to a single invitation each."),
    ).not.toBeInTheDocument();
  });

  it("still sends every typed row, because the server is the authority on duplicates", async () => {
    renderDialog();
    typeEmails("Alice@Example.com\nalice@example.com");
    chooseRole();
    submit();

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(lastSubmission().variables.emails).toEqual([
      "Alice@Example.com",
      "alice@example.com",
    ]);
  });
});

describe("UserBulkInviteDialog — per-row failures stay visible", () => {
  const PARTIAL_BATCH: BulkRow[] = [
    { email: "alice@example.com", originalEmail: "alice@example.com", success: true, invitationId: "inv-1" },
    {
      email: "bob@example.com",
      originalEmail: "bob@example.com",
      success: false,
      error: "Member limit reached for your plan",
    },
    {
      email: "carol@rival.test",
      originalEmail: "carol@rival.test",
      success: false,
      error: "Email domain rival.test is not allowed in this organization",
    },
    {
      email: "alice@example.com",
      originalEmail: "ALICE@example.com",
      success: false,
      isDuplicate: true,
      error: "Duplicate email in batch",
    },
  ];

  async function submitPartialBatch() {
    renderDialog();
    typeEmails("alice@example.com\nbob@example.com\ncarol@rival.test\nALICE@example.com");
    chooseRole();
    submit();
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    resolveWith(PARTIAL_BATCH);
    await screen.findByText("Invitations partially queued");
  }

  it("names each recipient that failed and the reason it failed", async () => {
    await submitPartialBatch();

    expect(screen.getByText("1 invitation queued")).toBeInTheDocument();
    expect(screen.getByText("3 could not be invited")).toBeInTheDocument();

    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.getByText("Member limit reached for your plan")).toBeInTheDocument();

    expect(screen.getByText("carol@rival.test")).toBeInTheDocument();
    expect(
      screen.getByText("Email domain rival.test is not allowed in this organization"),
    ).toBeInTheDocument();

    expect(screen.getByText("ALICE@example.com")).toBeInTheDocument();
    expect(screen.getByText("Duplicate in this batch")).toBeInTheDocument();
  });

  it("does not claim success when some rows failed", async () => {
    await submitPartialBatch();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("reports a wholly failed batch as a failure, not a queued batch", async () => {
    renderDialog();
    typeEmails("bob@example.com");
    chooseRole();
    submit();
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    resolveWith([
      {
        email: "bob@example.com",
        originalEmail: "bob@example.com",
        success: false,
        error: "Member limit reached for your plan",
      },
    ]);

    expect(await screen.findByText("Invitations failed")).toBeInTheDocument();
    expect(screen.getByText("No invitations queued")).toBeInTheDocument();
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(
      "No invitations could be sent. Review the failures below.",
    );
  });

  it("claims delivery is queued, never that it has happened", async () => {
    renderDialog();
    typeEmails("alice@example.com");
    chooseRole();
    submit();
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    resolveWith([
      { email: "alice@example.com", originalEmail: "alice@example.com", success: true, invitationId: "inv-1" },
    ]);

    expect(await screen.findByText("Invitations queued")).toBeInTheDocument();
    expect(toastSuccess).toHaveBeenCalledWith("1 invitation queued for delivery");
    expect(screen.getByText(/Delivery may take a few minutes/)).toBeInTheDocument();
  });
});

describe("UserBulkInviteDialog — retry does not resend what already succeeded", () => {
  it("re-arms the form with only the failed addresses, never the successful ones", async () => {
    renderDialog();
    typeEmails("alice@example.com\nbob@example.com\ncarol@rival.test\nALICE@example.com");
    chooseRole();
    submit();
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    resolveWith([
      { email: "alice@example.com", originalEmail: "alice@example.com", success: true, invitationId: "inv-1" },
      { email: "bob@example.com", originalEmail: "bob@example.com", success: false, error: "Member limit reached for your plan" },
      { email: "carol@rival.test", originalEmail: "carol@rival.test", success: false, error: "Email domain rival.test is not allowed in this organization" },
      { email: "alice@example.com", originalEmail: "ALICE@example.com", success: false, isDuplicate: true, error: "Duplicate email in batch" },
    ]);

    const retry = await screen.findByRole("button", { name: "Retry 2 failed addresses" });
    fireEvent.click(retry);

    const box = emailsBox();
    expect(box.value).toBe("bob@example.com\ncarol@rival.test");
    expect(box.value).not.toContain("alice@example.com");
    expect(box.value).not.toContain("ALICE@example.com");

    submit();
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
    expect(lastSubmission().variables).toEqual({
      emails: ["bob@example.com", "carol@rival.test"],
      role: "MEMBER",
    });
  });

  it("offers a blank Invite more, not a retry, when nothing failed", async () => {
    renderDialog();
    typeEmails("alice@example.com");
    chooseRole();
    submit();
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    resolveWith([
      { email: "alice@example.com", originalEmail: "alice@example.com", success: true, invitationId: "inv-1" },
    ]);

    expect(await screen.findByRole("button", { name: "Invite more" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Retry \d+ failed/ })).not.toBeInTheDocument();
  });

  it("offers no retry when the only failures are in-batch duplicates already covered by a success", async () => {
    renderDialog();
    typeEmails("alice@example.com\nALICE@example.com");
    chooseRole();
    submit();
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    resolveWith([
      { email: "alice@example.com", originalEmail: "alice@example.com", success: true, invitationId: "inv-1" },
      { email: "alice@example.com", originalEmail: "ALICE@example.com", success: false, isDuplicate: true, error: "Duplicate email in batch" },
    ]);

    expect(await screen.findByRole("button", { name: "Invite more" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Retry \d+ failed/ })).not.toBeInTheDocument();
  });
});

describe("UserBulkInviteDialog — repeat submission and timeout recovery", () => {
  it("disables submit and cancel while the batch is in flight", async () => {
    isPending = true;
    renderDialog();
    typeEmails("alice@example.com");
    chooseRole();

    const submitButton = screen.getByRole("button", { name: /Invite 1 user|Queuing/ });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    fireEvent.click(submitButton);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("refuses to submit with no addresses at all", async () => {
    renderDialog();
    chooseRole();

    expect(screen.getByRole("button", { name: "Send invitations" })).toBeDisabled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("keeps the typed batch and allows a second attempt after a network timeout", async () => {
    renderDialog();
    typeEmails("alice@example.com\nbob@example.com");
    chooseRole();
    submit();
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

    lastSubmission().handlers.onError?.(new Error("The request timed out. Please try again."));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("The request timed out. Please try again."),
    );

    const box = emailsBox();
    expect(box.value).toBe("alice@example.com\nbob@example.com");
    const submitButton = screen.getByRole("button", { name: "Invite 2 users" });
    expect(submitButton).toBeEnabled();

    fireEvent.click(submitButton);
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
    expect(lastSubmission().variables.emails).toEqual([
      "alice@example.com",
      "bob@example.com",
    ]);
  });
});
