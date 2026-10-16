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

jest.mock("@/hooks/api/mail", () => ({
  useMailAccounts: () => ({ data: accounts, isLoading: false }),
}));

describe("global mail composer", () => {
  beforeEach(() => {
    canCompose = true;
    accounts = [{ id: 7, provider: "gmail", accountEmail: "mail@example.com", accountLabel: null, status: "active", isPrimary: true }];
    toastError.mockReset();
  });

  it("opens from the shared authenticated event entry point", () => {
    render(<MailComposeProvider><main>Any authenticated page</main></MailComposeProvider>);
    act(() => openGlobalMailComposer());
    expect(screen.getByRole("dialog", { name: "" })).toHaveTextContent("Global composer");
  });

  it("does not open without a connected account", () => {
    accounts = [];
    render(<MailComposeProvider><main>Any authenticated page</main></MailComposeProvider>);
    act(() => openGlobalMailComposer());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/connect a mail account/i));
  });
});
