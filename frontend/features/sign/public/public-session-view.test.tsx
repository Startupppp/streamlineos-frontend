import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { useSignPublicSession } from "@/hooks/api/sign/public";
import { PublicSessionView } from "./public-session-view";

jest.mock("@/hooks/api/sign/public", () => ({
  useSignPublicSession: jest.fn(),
}));

jest.mock("./signing-workspace", () => ({ SigningWorkspace: () => <div>workspace</div> }));
jest.mock("./auth-screen", () => ({ AuthScreen: () => <div>auth</div> }));
jest.mock("./consent-screen", () => ({ ConsentScreen: () => <div>consent</div> }));
jest.mock("./completion-screen", () => ({ CompletionScreen: () => <div>done</div> }));

const useSession = useSignPublicSession as unknown as jest.Mock;

describe("PublicSessionView", () => {
  it("tells a signer with an unknown link what to do next, instead of a bare Not found", () => {
    useSession.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("This signing link is invalid.", 404),
      refetch: jest.fn(),
    });
    render(<PublicSessionView token="bad-token" />);
    expect(screen.getByText("This signing link no longer works")).toBeInTheDocument();
    expect(screen.getByText(/ask them to send the link again/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry|try again/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Loading your signing session")).not.toBeInTheDocument();
  });

  it("shows the backend's message with a retry when the link could not be loaded for another reason", () => {
    useSession.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Service unavailable", 503),
      refetch: jest.fn(),
    });
    render(<PublicSessionView token="bad-token" />);
    expect(screen.getByText("This signing link is invalid")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry|try again/i })).toBeInTheDocument();
  });

  it("shows a skeleton, not a spinner, while the session loads", () => {
    useSession.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: jest.fn() });
    render(<PublicSessionView token="t" />);
    expect(screen.getByLabelText("Loading your signing session")).toBeInTheDocument();
  });

  it("explains a terminal state instead of offering the workspace", () => {
    useSession.mockReturnValue({
      data: { state: "envelope_voided", envelope: { title: "Offer letter" }, recipient: null, sender: null },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<PublicSessionView token="t" />);
    expect(screen.getByText("This request has been voided")).toBeInTheDocument();
    expect(screen.getByText("Offer letter")).toBeInTheDocument();
  });
});
