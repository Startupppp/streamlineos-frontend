import { act, render, screen } from "@testing-library/react";
import {
  MailComposeProvider,
  openGlobalMailComposer,
} from "@/features/mail/mail-compose-provider";

const toastError = jest.fn();
let canCompose = true;
let accounts = [
  {
    id: 7,
    provider: "gmail" as const,
    accountEmail: "mail@example.com",
    accountLabel: null,
    status: "active" as const,
    isPrimary: true,
  },
];

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => function ComposeMock({ open }: { open: boolean }) {
    return open ? <div role="dialog">Global composer</div> : null;
  },
}));

jest.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args), info: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => canCompose,
}));

interface AccountsState { isLoading: boolean; isError: boolean; isFetching: boolean; error: Error | null }
let accountsState: AccountsState = { isLoading: false, isError: false, isFetching: false, error: null };
const refetch = jest.fn();
jest.mock("@/hooks/api/mail", () => ({
  useMailAccounts: () => ({ data: accounts, ...accountsState, refetch }),
}));

describe("global mail composer", () => {
  beforeEach(() => {
    canCompose = true;
    accounts = [{ id: 7, provider: "gmail", accountEmail: "mail@example.com", accountLabel: null, status: "active", isPrimary: true }];
    accountsState = { isLoading: false, isError: false, isFetching: false, error: null };
    toastError.mockReset();
    refetch.mockReset();
  });

  it("opens from the shared authenticated event entry point", () => {
    render(<MailComposeProvider><main>Any authenticated page</main></MailComposeProvider>);
    act(() => openGlobalMailComposer());
    expect(screen.getByRole("dialog", { name: "" })).toHaveTextContent("Global composer");
  });

  it("explains how to connect when no account is connected, with a link to mail", () => {
    accounts = [];
    render(<MailComposeProvider><main>Any authenticated page</main></MailComposeProvider>);
    act(() => openGlobalMailComposer());
    expect(screen.queryByText("Global composer")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /connect a mail account/i })).toHaveAttribute("href", "/mail");
  });

  it("opens on a pending accounts read and says it is loading instead of refusing (BUG-012)", () => {
    accounts = [];
    accountsState = { isLoading: true, isError: false, isFetching: true, error: null };
    render(<MailComposeProvider><main>Any authenticated page</main></MailComposeProvider>);
    act(() => openGlobalMailComposer());
    expect(screen.getByRole("status")).toHaveTextContent(/loading your mail accounts/i);
  });

  it("shows a failed accounts read as an error with a retry, not as 'no accounts'", () => {
    accounts = [];
    accountsState = { isLoading: false, isError: true, isFetching: false, error: new Error("Mail is unavailable") };
    render(<MailComposeProvider><main>Any authenticated page</main></MailComposeProvider>);
    act(() => openGlobalMailComposer());
    expect(screen.getByRole("alert")).toHaveTextContent("Mail is unavailable");
    expect(screen.queryByRole("link", { name: /connect a mail account/i })).not.toBeInTheDocument();
    act(() => screen.getByRole("button", { name: "Retry" }).click());
    expect(refetch).toHaveBeenCalled();
  });
});
