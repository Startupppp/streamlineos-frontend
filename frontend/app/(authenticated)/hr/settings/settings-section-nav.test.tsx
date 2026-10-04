import { render, screen } from "@testing-library/react";
import HrSettingsLayout from "./layout";

jest.mock("next/navigation", () => ({
  usePathname: () => "/hr/settings/custom-fields",
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: { isOrgOwner: true, scopes: {}, modules: {} } }),
}));

jest.mock("@/hooks/common/use-hr-settings-mode", () => ({
  useHrSettingsMode: () => [false, jest.fn()],
}));

function renderLayout() {
  render(
    <HrSettingsLayout>
      <div>section body</div>
    </HrSettingsLayout>,
  );
}

describe("HR settings section navigation", () => {
  it("replaces the horizontal tab strip with a section picker below md rather than scrolling it off-canvas", () => {
    renderLayout();

    const strip = screen.getByRole("navigation", { name: "HR configuration" });
    expect(strip).toHaveClass("hidden");
    expect(strip).toHaveClass("md:inline-flex");

    const picker = screen.getByRole("combobox", { name: "HR configuration section" });
    expect(picker).toHaveClass("md:hidden");
    expect(picker).toHaveClass("w-full");
  });

  it("keeps the active advanced section selectable even with advanced mode off", () => {
    renderLayout();

    expect(
      screen.getByRole("link", { name: "Custom fields", current: "page" }),
    ).toBeInTheDocument();
  });
});
