import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemberPicker } from "./member-picker";
import { useMemberDirectory } from "@/hooks/api/members/use-member-directory";

jest.mock("@/hooks/api/members/use-member-directory", () => ({
  useMemberDirectory: jest.fn(() => ({
    members: [{
      id: "u-revoked",
      membershipId: null,
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
      membershipId: null,
      name: "Revoked User",
      firstName: null,
      lastName: null,
      email: "revoked@example.com",
      image: null,
      moduleAccessRevoked: true,
      description: "Access revoked — adding restores module access",
    }],
    isLoading: false,
    isServerFiltered: true,
  })),
}));

jest.mock("./member-picker-options", () => ({
  filterMembers: jest.fn((members: unknown) => members),
}));

describe("MemberPicker revoked module candidate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("routes Build ownership fields through the Build actor directory", () => {
    render(<MemberPicker directory="build" value="" onChange={jest.fn()} />);

    expect(jest.mocked(useMemberDirectory)).toHaveBeenCalledWith(
      { kind: "build" },
      expect.objectContaining({ search: "" }),
    );
  });

  it("leaves revoked candidate discovery disabled for ordinary pickers", () => {
    render(<MemberPicker moduleKey="build" value="" onChange={jest.fn()} />);

    expect(jest.mocked(useMemberDirectory)).toHaveBeenCalledWith(
      { kind: "module", moduleKey: "build", excludeAssigned: true, includeRevoked: false },
      expect.objectContaining({ search: "" }),
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
    expect(jest.mocked(useMemberDirectory)).toHaveBeenCalledWith(
      { kind: "module", moduleKey: "build", excludeAssigned: true, includeRevoked: true },
      expect.objectContaining({ search: "" }),
    );
  });
});
