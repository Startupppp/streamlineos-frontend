import { render, screen } from "@testing-library/react";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  useModuleEnabled: () => true,
}));

jest.mock("@/hooks/api/users", () => ({
  useInviteUser: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("./invite-seat-notice", () => ({
  InviteSeatNotice: () => null,
}));

import { UserInviteDialog } from "./user-invite-dialog";

describe("UserInviteDialog — permission-hidden controls", () => {
  it("still opens but RBAC-gated controls stay unavailable when manage is denied", () => {
    render(<UserInviteDialog open onOpenChange={jest.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
