import { render, screen } from "@testing-library/react";
import { useCan } from "@/hooks/api/access";
import { UserAccessLinksSection } from "./user-access-links-section";

jest.mock("@animateicons/react/lucide", () => ({
  ChevronRightIcon: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useModuleEnabled: jest.fn(() => true),
}));

const mockUseCan = useCan as jest.Mock;

describe("UserAccessLinksSection", () => {
  it("never implies custom roles can be created and names the least-privilege path", () => {
    mockUseCan.mockReturnValue(true);
    render(<UserAccessLinksSection userId="u-1" />);

    expect(screen.queryByText(/custom/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Org roles are Owner, Admin and Member. Narrow this person's access with module access presets and the module availability above.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Roles & Permissions/ })).toHaveAttribute(
      "href",
      "/settings/roles",
    );
    expect(screen.getByText("Owner, Admin and Member permissions")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "HR" })).toHaveAttribute(
      "href",
      "/hr/access?userId=u-1",
    );
  });
});
