import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { FilterCategoryList } from "./filter-category-list";

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span {...props}>{children}</span>
    ),
  },
  useReducedMotion: () => false,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null } }),
}));

describe("FilterCategoryList", () => {
  it("applies a category with one option directly without exposing a submenu", () => {
    const directAction = jest.fn();
    const onSelectCategory = jest.fn();

    render(
      <FilterCategoryList
        visibleCategories={[
          {
            key: "project",
            label: "Only project",
            visible: true,
            activeCount: 0,
            directAction,
          },
        ]}
        resolvedCategory={null}
        containerRef={createRef<HTMLDivElement>()}
        isMobile={false}
        shouldReduceMotion={false}
        onSelectCategory={onSelectCategory}
        onCategoryKeyDown={jest.fn()}
        dense
      />,
    );

    const option = screen.getByRole("menuitem", { name: /only project/i });
    expect(option).not.toHaveAttribute("aria-haspopup");
    expect(screen.getByText("Add")).toBeInTheDocument();

    fireEvent.click(option);

    expect(directAction).toHaveBeenCalledTimes(1);
    expect(onSelectCategory).not.toHaveBeenCalled();
  });

  it("keeps multi-option categories as keyboard-accessible submenus", () => {
    const onSelectCategory = jest.fn();
    const onCategoryKeyDown = jest.fn();

    render(
      <FilterCategoryList
        visibleCategories={[
          { key: "status", label: "Status", visible: true, activeCount: 0 },
        ]}
        resolvedCategory="status"
        containerRef={createRef<HTMLDivElement>()}
        isMobile={false}
        shouldReduceMotion={false}
        onSelectCategory={onSelectCategory}
        onCategoryKeyDown={onCategoryKeyDown}
        dense
      />,
    );

    const option = screen.getByRole("menuitem", { name: "Status" });
    expect(option).toHaveAttribute("aria-haspopup", "true");
    expect(option).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(option, { key: "ArrowRight" });
    expect(onCategoryKeyDown).toHaveBeenCalledTimes(1);
  });
});
