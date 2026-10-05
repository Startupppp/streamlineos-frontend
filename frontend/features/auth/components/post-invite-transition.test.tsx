const mockRouterReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostInviteTransition, PARTIAL_GRANTS_KEY } from "./post-invite-transition";

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
});

describe("PostInviteTransition — no skipped grants", () => {
  it("redirects immediately to destination when sessionStorage has no partial grants entry", () => {
    render(<PostInviteTransition destination="/build" />);
    expect(mockRouterReplace).toHaveBeenCalledWith("/build");
  });

  it("redirects immediately when the stored value is an empty array", () => {
    sessionStorage.setItem(PARTIAL_GRANTS_KEY, JSON.stringify([]));
    render(<PostInviteTransition destination="/dashboard" />);
    expect(mockRouterReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("renders nothing visible while redirecting", () => {
    const { container } = render(<PostInviteTransition destination="/build" />);
    expect(container.firstChild).toBeNull();
  });
});

describe("PostInviteTransition — with skipped grants", () => {
  beforeEach(() => {
    sessionStorage.setItem(
      PARTIAL_GRANTS_KEY,
      JSON.stringify([
        { module: "build", reason: "INVITER_AUTHORITY_REVOKED" },
        { module: "hr", reason: "ROLE_NOT_SEEDED" },
      ]),
    );
  });

  it("renders the notice listing each skipped module", () => {
    render(<PostInviteTransition destination="/dashboard" />);
    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.getByText("HR")).toBeInTheDocument();
  });

  it("does not auto-redirect when there are skipped grants", () => {
    render(<PostInviteTransition destination="/dashboard" />);
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it("clears the sessionStorage entry on mount so a page refresh does not repeat the notice", () => {
    render(<PostInviteTransition destination="/dashboard" />);
    expect(sessionStorage.getItem(PARTIAL_GRANTS_KEY)).toBeNull();
  });

  it("navigates to destination when the Continue button is clicked", async () => {
    const user = userEvent.setup();
    render(<PostInviteTransition destination="/dashboard" />);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(mockRouterReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("navigates to destination when the Dismiss button is clicked", async () => {
    const user = userEvent.setup();
    render(<PostInviteTransition destination="/dashboard" />);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(mockRouterReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("explains each skipped module with its own reason", () => {
    render(<PostInviteTransition destination="/dashboard" />);
    expect(screen.getByText(/can no longer grant this access/i)).toBeInTheDocument();
    expect(screen.getByText(/no longer exists in this organization/i)).toBeInTheDocument();
  });

  it("ignores a stored value that does not match the skipped-grant contract", () => {
    sessionStorage.setItem(PARTIAL_GRANTS_KEY, JSON.stringify([{ module: "hr", reason: "FORGED" }]));
    render(<PostInviteTransition destination="/dashboard" />);
    expect(mockRouterReplace).toHaveBeenCalledWith("/dashboard");
  });
});
