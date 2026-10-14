import { fireEvent, render, screen } from "@testing-library/react";
import { SettingsProfile } from "./settings-profile";

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "user-1", name: "Ada Lovelace", email: "ada@example.test" } },
  }),
}));
jest.mock("@/hooks/api/auth", () => ({
  useUpdateMyProfile: () => ({ isPending: false, mutate: jest.fn() }),
}));
jest.mock("@/hooks/common/use-confirmed-session-claims-refresh", () => ({
  useConfirmedSessionClaimsRefresh: () => jest.fn(),
}));

describe("the display-name edit control (BUG-015)", () => {
  it("shows the name input in the same render as the click, never an empty field", () => {
    render(<SettingsProfile />);

    fireEvent.click(screen.getByRole("button", { name: "Click to edit name" }));

    expect(screen.getByPlaceholderText("Your full name")).toHaveValue("Ada Lovelace");
  });
});
