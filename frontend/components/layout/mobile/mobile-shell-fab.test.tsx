import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const panelMounted = jest.fn();

jest.mock("next/dynamic", () =>
  () =>
    function DynamicFabPanel(props: Record<string, unknown>) {
      panelMounted(props);
      return null;
    },
);

let mockAfterLoad = false;
jest.mock("@/hooks/common/use-after-load", () => ({
  useAfterLoad: () => mockAfterLoad,
}));

jest.mock("./mobile-shell-fab-panel", () => ({
  MobileShellFabPanel: () => null,
}));

jest.mock("./use-mobile-shell-fab-position", () => ({
  useMobileShellFabPosition: ({ onTap }: { onTap: () => void }) => {
    void onTap;
    return {
      containerRef: { current: null },
      style: {},
      isDragging: false,
      isPositioned: true,
      pointerHandlers: {},
      consumeSuppressClick: () => false,
    };
  },
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({
    "aria-label": ariaLabel,
    "aria-expanded": ariaExpanded,
    onClick,
  }: {
    "aria-label"?: string;
    "aria-expanded"?: boolean;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    icon?: unknown;
    iconSize?: number;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      onClick={onClick}
    />
  ),
}));

jest.mock("@animateicons/react/lucide", () => ({
  EllipsisIcon: () => null,
}));

import { MobileShellFab } from "./mobile-shell-fab";

function renderFab() {
  return render(
    <MobileShellFab onOpenMobileMenu={jest.fn()} showAboveBottomNav={false} />,
  );
}

beforeEach(() => {
  panelMounted.mockClear();
  mockAfterLoad = false;
});

describe("MobileShellFab", () => {
  it("does not mount the panel before the FAB is clicked", () => {
    renderFab();
    expect(panelMounted).not.toHaveBeenCalled();
  });

  it("mounts the panel the first time the FAB is clicked", async () => {
    renderFab();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open quick actions" }));
    expect(panelMounted).toHaveBeenCalled();
  });

  it("keeps the panel mounted on subsequent clicks", async () => {
    renderFab();
    const user = userEvent.setup();
    const btn = screen.getByRole("button", { name: "Open quick actions" });
    await user.click(btn);
    const countAfterFirst = panelMounted.mock.calls.length;
    await user.click(btn);
    expect(panelMounted.mock.calls.length).toBeGreaterThan(countAfterFirst);
  });

  it("starts with aria-expanded false", () => {
    renderFab();
    expect(
      screen.getByRole("button", { name: "Open quick actions" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("sets aria-expanded true after the first click", async () => {
    renderFab();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open quick actions" }));
    expect(
      screen.getByRole("button", { name: "Open quick actions" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("toggles aria-expanded on successive clicks", async () => {
    renderFab();
    const user = userEvent.setup();
    const btn = screen.getByRole("button", { name: "Open quick actions" });
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("does not mount the panel when afterLoad fires without a click", async () => {
    const { rerender } = renderFab();
    expect(panelMounted).not.toHaveBeenCalled();

    mockAfterLoad = true;
    await act(async () => {
      rerender(
        <MobileShellFab
          onOpenMobileMenu={jest.fn()}
          showAboveBottomNav={false}
        />,
      );
    });

    expect(panelMounted).not.toHaveBeenCalled();
  });

  it("passes fabOpen=true to the panel once the transition completes", async () => {
    renderFab();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open quick actions" }));
    const lastCall = panelMounted.mock.calls.at(-1);
    expect(lastCall?.[0]).toMatchObject({ fabOpen: true });
  });
});
