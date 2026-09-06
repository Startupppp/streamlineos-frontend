"use client";

import { render, screen } from "@testing-library/react";

let mockVariant: "mobile" | "desktop" = "desktop";

jest.mock("@/components/layout/shell-variant-context", () => ({
  useShellVariant: () => mockVariant,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: ({ placeholder }: { placeholder: string }) => (
    <input placeholder={placeholder} />
  ),
}));

import { NotificationFilterBar } from "./notification-filter-bar";

const noop = () => {};

function renderFilterBar(variant: "mobile" | "desktop") {
  mockVariant = variant;
  return render(
    <NotificationFilterBar
      search=""
      onSearchChange={noop}
      onClearSearch={noop}
      activeSection="ALL"
      onSectionChange={noop}
      activeCategory={undefined}
      onCategoryChange={noop}
      activePriority={undefined}
      onPriorityChange={noop}
      onClearFilters={noop}
      unreadCount={0}
    />,
  );
}

describe("NotificationFilterBar mobile vs desktop", () => {
  it("renders section select on desktop", () => {
    renderFilterBar("desktop");
    expect(
      screen.getByRole("combobox", { name: "Notification section" }),
    ).toBeInTheDocument();
  });

  it("does not render section select on mobile — skips 3 Radix Selects to reduce hydration cost", () => {
    renderFilterBar("mobile");
    expect(
      screen.queryByRole("combobox", { name: "Notification section" }),
    ).not.toBeInTheDocument();
  });
});
