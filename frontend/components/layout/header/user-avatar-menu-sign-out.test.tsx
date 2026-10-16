import { render, screen } from "@testing-library/react";
import { UserAvatarMenu } from "./user-avatar-menu";

const signOut = jest.fn();
let mobile = false;

jest.mock("next/dynamic", () => () => () => null);
jest.mock("next-auth/react", () => ({ useSession: () => ({ data: null, status: "loading" }) }));
jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => mobile }));
jest.mock("@/hooks/common/auth-hooks", () => ({
  useSignOut: () => ({ mutate: signOut, isPending: false }),
}));

describe("the account menu's Sign out", () => {
  it("renders in the dropdown even when the menu body and the profile never load", () => {
    mobile = false;
    render(<UserAvatarMenu open onOpenChange={jest.fn()} />);

    screen.getByRole("menuitem", { name: "Sign out" }).click();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("renders in the mobile drawer as well", () => {
    mobile = true;
    render(<UserAvatarMenu open onOpenChange={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
