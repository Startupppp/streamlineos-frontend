import { render, screen } from "@testing-library/react";
import { MailHeader } from "./mail-header";
import type { MailAccount } from "@/types/mail";

jest.mock("@/hooks/api/mail", () => ({
  useMailMessages: () => ({
    data: {
      pages: [
        {
          messages: [{ id: "unread", isRead: false }, { id: "read", isRead: true }],
        },
      ],
    },
  }),
}));

const accounts: MailAccount[] = [
  {
    id: 7,
    provider: "gmail",
    accountEmail: "mail@example.com",
    accountLabel: null,
    status: "active",
    isPrimary: true,
  },
];

const callbacks = {
  onAccountChange: jest.fn(),
  onCompose: jest.fn(),
  onGenerateBrief: jest.fn(),
  onOpenBrief: jest.fn(),
  onOpenAccounts: jest.fn(),
};

it("uses one common page header with the daily brief in its action row", () => {
  render(
    <MailHeader
      accounts={accounts}
      accountsLoading={false}
      selectedAccountId="all"
      canAi
      summaryState={{ status: "idle" }}
      {...callbacks}
    />,
  );

  expect(screen.getByRole("heading", { name: "Mail" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Mail" })).not.toHaveClass("hidden");
  expect(screen.getByText("Messages and follow-ups across your connected accounts")).toBeInTheDocument();
  expect(screen.getAllByLabelText("Daily mail brief")).toHaveLength(1);
  expect(screen.queryByText("Your inbox, distilled")).toBeNull();
  expect(screen.getByRole("button", { name: "Compose" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Compose mail" })).toHaveClass("fixed", "md:hidden");
  expect(screen.getByRole("button", { name: "Compose mail" })).toHaveClass("bottom-[calc(4rem+0.375rem+env(safe-area-inset-bottom))]");
  expect(screen.getByRole("button", { name: "Compose mail" })).toHaveClass("z-50");
  expect(screen.getByRole("button", { name: "Mail account settings" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Switch mail account. Current: All accounts" })).toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "Account: All accounts" })).toBeNull();
});

it("keeps the generated brief in the header without rendering a second banner", () => {
  render(
    <MailHeader
      accounts={accounts}
      accountsLoading={false}
      selectedAccountId="all"
      canAi
      summaryState={{
        status: "ready",
        summary: "Two customer replies need attention",
        highlights: [],
        actionItems: ["Reply to Ada", "Review renewal"],
      }}
      {...callbacks}
    />,
  );

  expect(screen.getByText("Two customer replies need attention")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "View daily mail brief" })).toBeEnabled();
  expect(screen.getByText("2", { selector: "span" })).toBeInTheDocument();
});
