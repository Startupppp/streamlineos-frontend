import { render } from "@testing-library/react";
import { BuildSidebarSkeleton } from "./build-sidebar-skeleton";

describe("BuildSidebarSkeleton — mirrors the real sidebar's sections rather than being one generic block", () => {
  test("expanded: a scope-selector block, a section-label block, a primary nav group and a separate trailing utility group all render as distinct pieces", () => {
    const { container } = render(<BuildSidebarSkeleton />);

    const scopeSelector = container.querySelector(".h-10.rounded-md");
    const sectionLabel = container.querySelector(".mt-3");
    const navGroup = container.querySelector(".space-y-px");
    const utilityGroup = container.querySelector(".pt-2");

    expect(scopeSelector).not.toBeNull();
    expect(sectionLabel).not.toBeNull();
    expect(navGroup).not.toBeNull();
    expect(utilityGroup).not.toBeNull();
    expect(navGroup).not.toBe(utilityGroup);
    expect(navGroup?.children).toHaveLength(5);
    expect(utilityGroup?.children).toHaveLength(3);
  });

  test("collapsed: the section label becomes a divider (matching the real sidebar's collapsed SectionLabel) rather than disappearing, and the two nav groups stay distinct", () => {
    const { container } = render(<BuildSidebarSkeleton isCollapsed />);

    const divider = container.querySelector(".bg-sidebar-border");
    const navGroup = container.querySelector(".space-y-px");
    const utilityGroup = container.querySelector(".pt-2");

    expect(divider).not.toBeNull();
    expect(navGroup).not.toBeNull();
    expect(utilityGroup).not.toBeNull();
    expect(navGroup).not.toBe(utilityGroup);
    expect(navGroup?.children).toHaveLength(5);
    expect(utilityGroup?.children).toHaveLength(3);
  });
});
