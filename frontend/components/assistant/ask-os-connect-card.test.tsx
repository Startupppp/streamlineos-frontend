import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AskOsConnectCard } from "./ask-os-connect-card";

const mutateAsync = jest.fn();
const canManage = jest.fn<boolean, [string]>();
const toastError = jest.fn();
const assign = jest.fn();

jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => canManage(key) }));
jest.mock("@/hooks/api/integrations", () => ({
  useInitiateIntegrationConnection: () => ({ mutateAsync, isPending: false }),
}));
jest.mock("sonner", () => ({ toast: { error: (message: string) => toastError(message) } }));

beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue({ redirectUrl: "https://composio.test/oauth/gmail" });
  canManage.mockReset().mockReturnValue(true);
  toastError.mockReset();
  assign.mockReset();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { assign, pathname: "/crm/leads" },
  });
});

describe("a mail gap renders an actionable card, never dead-end prose", () => {
  it("offers a Connect button that starts the OAuth handoff and navigates to the provider", async () => {
    render(
      <AskOsConnectCard toolkit="gmail" reason="no-connection" summary="Connect a mail account to send emails." />,
    );

    const button = screen.getByRole("button", { name: "Connect Gmail" });
    await userEvent.click(button);

    expect(mutateAsync).toHaveBeenCalledWith({ toolkit: "gmail", returnPath: "/crm/leads" });
    expect(assign).toHaveBeenCalledWith("https://composio.test/oauth/gmail");
  });

  it("says Reconnect rather than Connect for an expired grant, so the two gaps are not confused", () => {
    render(
      <AskOsConnectCard toolkit="gmail" reason="needs-reauth" summary="Reconnect your mail account." />,
    );

    expect(screen.getByRole("button", { name: "Reconnect Gmail" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Connect Gmail" })).not.toBeInTheDocument();
    expect(screen.getByText("Reconnect your mail account.")).toBeInTheDocument();
    expect(screen.queryByText("AI-generated")).not.toBeInTheDocument();
  });

  it("names the provider from the toolkit rather than printing the raw toolkit slug", () => {
    render(
      <AskOsConnectCard toolkit="googlecalendar" reason="no-connection" summary="Connect a calendar." />,
    );

    expect(screen.getByRole("button", { name: "Connect Google Calendar" })).toBeInTheDocument();
    expect(screen.queryByText(/googlecalendar/)).not.toBeInTheDocument();
  });

  it("tells a member without connection rights who to ask instead of offering a button that would 403", () => {
    canManage.mockReturnValue(false);

    render(
      <AskOsConnectCard toolkit="outlook" reason="no-connection" summary="Connect a mail account." />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Ask an admin to connect your Outlook account.")).toBeInTheDocument();
  });

  it("surfaces a failed handoff as a toast and stays on the page rather than navigating nowhere", async () => {
    mutateAsync.mockRejectedValue(new Error("Composio is unavailable"));

    render(
      <AskOsConnectCard toolkit="gmail" reason="no-connection" summary="Connect a mail account." />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Connect Gmail" }));

    expect(assign).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Composio is unavailable");
  });
});
