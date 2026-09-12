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

/**
 * A failed session read used to render the loading placeholder forever: the
 * view tested `isLoading || !session` before `isError`, and on an error
 * `session` is undefined, so the error branch was unreachable. Every invalid,
 * expired or revoked link — the states this page exists to explain — spun.
 */
describe("PublicSessionView", () => {
  it("shows the error, with the backend's message, when the link cannot be resolved", () => {
    useSession.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("This signing link is invalid.", 404),
      refetch: jest.fn(),
    });
    render(<PublicSessionView token="bad-token" />);
    expect(screen.getByText("This signing link is invalid")).toBeInTheDocument();
    expect(screen.getByText("This signing link is invalid.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Loading your signing session")).not.toBeInTheDocument();
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
