/**
 * Five surfaces render the chart of accounts into a `<Select>`: the bank-account
 * GL mapping, the reconciliation match panel, the asset-category mapping, the
 * recurring-journal line editor and the finance settings dialogs. Every one of
 * them read `accountsQuery.data?.data ?? []` with no error branch anywhere in
 * the file, so a failed read and an org with no accounts produced the same
 * empty, enabled dropdown.
 *
 * `AccountListNotice` is the one place that distinguishes the two, and it also
 * carries the truncation case: `useAllAccounts` follows the cursor to a bounded
 * ceiling, and if a chart ever exceeded it the list would be short by exactly
 * the amount nobody could see.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountListNotice } from "./account-list-notice";

const refetch = jest.fn();

function query(overrides: {
  isError?: boolean;
  error?: Error | null;
  hasMore?: boolean;
}) {
  return {
    isError: overrides.isError ?? false,
    error: overrides.error ?? null,
    data: {
      data: [],
      pagination: { limit: 2000, hasMore: overrides.hasMore ?? false, nextCursor: null },
    },
    refetch,
  };
}

describe("AccountListNotice", () => {
  beforeEach(() => {
    refetch.mockClear();
  });

  it("renders nothing when the chart loaded whole", () => {
    const { container } = render(<AccountListNotice query={query({})} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("says the accounts failed to load rather than leaving the list silently empty", () => {
    render(
      <AccountListNotice
        query={query({ isError: true, error: new Error("Chart of accounts is locked for migration") })}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load accounts/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/locked for migration/i);
  });

  it("offers a retry that refetches", async () => {
    render(<AccountListNotice query={query({ isError: true, error: new Error("boom") })} />);

    await userEvent.setup().click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("says the list is truncated when the chart exceeded the fetch ceiling", () => {
    render(<AccountListNotice query={query({ hasMore: true })} />);

    expect(screen.getByRole("status")).toHaveTextContent(/first 2,000/i);
  });

  it("reports the failure, not the truncation, when both are true", () => {
    render(
      <AccountListNotice query={query({ isError: true, error: new Error("boom"), hasMore: true })} />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
