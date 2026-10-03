import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemberPicker } from "./member-picker";
import { useMemberOptions } from "./member-picker-options";

jest.mock("./member-picker-options", () => ({
  useMemberOptions: jest.fn(() => ({
    options: [{
      id: "u-revoked",
      name: "Revoked User",
      firstName: null,
      lastName: null,
      email: "revoked@example.com",
      image: null,
      moduleAccessRevoked: true,
      description: "Access revoked — adding restores module access",
    }],
    selectedMembers: [{
      id: "u-revoked",
      name: "Revoked User",
      firstName: null,
      lastName: null,
      email: "revoked@example.com",
      image: null,
      moduleAccessRevoked: true,
      description: "Access revoked — adding restores module access",
    }],
  })),
  filterMembers: jest.fn((members: unknown) => members),
}));

describe("MemberPicker revoked module candidate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("leaves revoked candidate discovery disabled for ordinary pickers", () => {
    render(<MemberPicker moduleKey="build" value="" onChange={jest.fn()} />);

    expect(jest.mocked(useMemberOptions)).toHaveBeenCalledWith(
      undefined,
      undefined,
      "build",
      true,
      false,
      false,
      "",
      [],
    );
  });

  it("explains access restoration before a revoked candidate is selected", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<MemberPicker moduleKey="build" includeRevoked value="" onChange={onChange} />);

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByText("Access revoked — adding restores module access")).toBeVisible();
    await user.click(screen.getByRole("option", { name: /Revoked User/ }));
    expect(onChange).toHaveBeenCalledWith("u-revoked");
  });

  it("keeps the revoked label visible after selection and forwards the explicit option", () => {
    render(
      <MemberPicker
        moduleKey="build"
        includeRevoked
        value="u-revoked"
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByText("Revoked")).toBeInTheDocument();
    expect(jest.mocked(useMemberOptions)).toHaveBeenCalledWith(
      undefined,
      undefined,
      "build",
      true,
      true,
      true,
      "",
      ["u-revoked"],
    );
  });
});
