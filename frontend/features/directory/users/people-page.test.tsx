import { render, screen } from "@testing-library/react";
import { PeoplePage } from "./people-page";

let mockSearch = "";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));
jest.mock("./user-invitations-panel", () => ({
  UserInvitationsPanel: () => <p>invitations panel</p>,
}));
jest.mock("./users-page", () => ({
  UsersPage: () => <p>members table</p>,
}));

/**
 * QA 2026-10-13: an invitations URL showed a skeleton and then Members. The
 * page gated on membership authority, which reads false until /me/access
 * resolves; the panel owns its own pending / denied / error states.
 */
describe("PeoplePage view routing", () => {
  it.each(["view=invitations", "tab=invites", "tab=invitations"])(
    "renders the invitations panel for ?%s before access has resolved",
    (search) => {
      mockSearch = search;
      render(<PeoplePage />);
      expect(screen.getByText("invitations panel")).toBeInTheDocument();
      expect(screen.queryByText("members table")).not.toBeInTheDocument();
    },
  );

  it("renders Members with no view param", () => {
    mockSearch = "";
    render(<PeoplePage />);
    expect(screen.getByText("members table")).toBeInTheDocument();
  });
});
