import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemberPicker } from "./member-picker";
import { useMemberDirectory } from "@/hooks/api/members/use-member-directory";

jest.mock("@/hooks/api/members/use-member-directory", () => ({
  useMemberDirectory: jest.fn(),
}));

function directory(isLoading: boolean) {
  return { members: [], selectedMembers: [], isLoading, isServerFiltered: true };
}

describe("MemberPicker empty query", () => {
  it("says it is loading, not that nobody exists, while the first page is in flight", async () => {
    jest.mocked(useMemberDirectory).mockReturnValue(directory(true));
    render(<MemberPicker value="" onChange={jest.fn()} />);

    await userEvent.setup().click(screen.getByRole("combobox"));

    expect(screen.getByRole("status")).toHaveTextContent("Loading members…");
    expect(screen.queryByText("No members found.")).not.toBeInTheDocument();
  });

  it("says no members found once a loaded page is empty", async () => {
    jest.mocked(useMemberDirectory).mockReturnValue(directory(false));
    render(<MemberPicker value="" onChange={jest.fn()} />);

    await userEvent.setup().click(screen.getByRole("combobox"));

    expect(screen.getByRole("status")).toHaveTextContent("No members found.");
  });
});
