import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import { ManageReferrersSheet } from "./manage-referrers-sheet";

const referrers = jest.fn();

jest.mock("@/hooks/api/hr/recruitment/external-referrals", () => ({
  useExternalReferrers: () => referrers(),
  useUpdateExternalReferrerStatus: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const CORRELATION_ID = "req_7f3a91";

function failing(status: number, refetch: jest.Mock) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", status, undefined, {
      correlationId: CORRELATION_ID,
    }),
    refetch,
  };
}

async function openSheet(): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: /manage referrers/i }));
}

beforeEach(() => {
  jest.clearAllMocks();
  referrers.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
});

describe("HRMS-B3-010 a failing external-referrers read does not read as no referrers", () => {
  it("shows an inline error with a retry instead of an empty roster when the read 500s", async () => {
    const refetch = jest.fn();
    referrers.mockReturnValue(failing(500, refetch));
    render(<ManageReferrersSheet />);
    await openSheet();

    expect(screen.queryByText(/no external referrers yet/i)).toBeNull();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(CORRELATION_ID)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("still shows the honest empty state on a genuine zero-row read", async () => {
    render(<ManageReferrersSheet />);
    await openSheet();

    expect(screen.getByText(/no external referrers yet/i)).toBeInTheDocument();
  });
});
