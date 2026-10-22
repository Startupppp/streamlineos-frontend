import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KbSharingSettingsPage from "./kb-sharing-settings-page";
import { toast } from "sonner";

const updateSettingsMutate = jest.fn();

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const defaultSettings = {
  externalSharing: "guests_and_links" as const,
  guestGrantMaxDays: 30,
  shareLinkMaxDays: 14,
  guestAllowDownloadDefault: false,
  shareLinkAllowDownloadDefault: true,
};

jest.mock("@/hooks/api/kb/sharing", () => ({
  useKbSharingSettings: () => ({ data: defaultSettings, isLoading: false, isError: false, error: null }),
  useUpdateKbSharingSettings: () => ({ mutate: updateSettingsMutate, isPending: false }),
  useKbSharingInventoryPage: () => ({
    data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null } },
    isLoading: false,
  }),
  useBulkRevokeKbSharing: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useCanState: () => "allowed",
  useAccess: () => ({ data: { isOrgOwner: true, scopes: {}, modules: { kb: true } }, isLoading: false }),
}));

jest.mock("@/hooks/api/entitlements", () => ({ useEntitlements: () => ({ data: undefined }) }));

jest.mock("@/hooks/common/use-cursor-pagination", () => ({
  useCursorPagination: () => ({
    cursor: undefined,
    pageNumber: 1,
    hasPrevious: false,
    goNext: jest.fn(),
    goPrevious: jest.fn(),
    reset: jest.fn(),
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("KbSharingSettingsPage — settings form", () => {
  it("renders the sharing mode select, so the admin can configure the tenant sharing policy", () => {
    render(<KbSharingSettingsPage />);
    expect(screen.getByRole("combobox", { name: /external sharing mode/i })).toBeInTheDocument();
  });

  it("pre-fills the form with the current settings on load", () => {
    render(<KbSharingSettingsPage />);
    expect(screen.getByDisplayValue("30")).toBeInTheDocument();
  });

  it("calls updateSettings mutation on submit", async () => {
    const user = userEvent.setup();
    render(<KbSharingSettingsPage />);

    await user.click(screen.getByRole("button", { name: /save settings/i }));

    expect(updateSettingsMutate).toHaveBeenCalledTimes(1);
  });

  it("shows a success toast after saving", async () => {
    const user = userEvent.setup();
    render(<KbSharingSettingsPage />);

    await user.click(screen.getByRole("button", { name: /save settings/i }));
    updateSettingsMutate.mock.calls[0]?.[1].onSuccess();

    expect(toast.success).toHaveBeenCalledWith("Sharing settings saved");
  });
});

describe("KbSharingSettingsPage — inventory section", () => {
  it("renders the sharing inventory heading so the admin can see who has external access", () => {
    render(<KbSharingSettingsPage />);
    expect(screen.getByText("Sharing inventory")).toBeInTheDocument();
  });
});
