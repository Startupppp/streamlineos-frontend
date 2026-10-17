import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatOrgSettingsPage } from "./chat-org-settings-page";

const mutate = jest.fn();
jest.mock("@/components/renderer/use-tenant-layout", () => ({ useTenantLayout: <T,>(l: T): T => l }));
jest.mock("@/hooks/api/chat-org-settings", () => ({
  useChatOrgSettings: () => ({
    data: {
      orgId: "org-1",
      defaultNotificationPreference: "ALL",
      maxAttachmentSizeMb: 25,
      maxHuddleParticipants: 50,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useUpdateChatOrgSettings: () => ({ mutate, isPending: false }),
}));
jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: () => ({ kind: "ready" }) }));
jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

beforeEach(() => mutate.mockReset());

describe("ChatOrgSettingsPage", () => {
  it("starts from the saved values and sends numbers, not strings", async () => {
    render(<ChatOrgSettingsPage />);
    const size = screen.getByLabelText(/Maximum attachment size \(MB\)/);
    expect(size).toHaveValue(25);

    await userEvent.clear(size);
    await userEvent.type(size, "100");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith({
        defaultNotificationPreference: "ALL",
        maxAttachmentSizeMb: 100,
        maxHuddleParticipants: 50,
      }),
    );
  });

  it("refuses a value outside the backend's bounds without sending", async () => {
    render(<ChatOrgSettingsPage />);
    const huddle = screen.getByLabelText(/Maximum huddle participants/);

    await userEvent.clear(huddle);
    await userEvent.type(huddle, "1");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Enter a number from 2 to 500")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});
