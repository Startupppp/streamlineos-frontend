import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const panelMounted = jest.fn();

jest.mock("next/dynamic", () => () => {
  function DynamicFabPanelBody(props: Record<string, unknown>) {
    panelMounted(props);
    return <div data-testid="fab-panel-body" />;
  }
  return DynamicFabPanelBody;
});

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

function sheetElement(): HTMLElement {
  const sheet = document.querySelector<HTMLElement>(
    '[data-slot="mobile-shell-fab-sheet"]',
  );
  if (!sheet) throw new Error("the quick-actions sheet is not mounted");
  return sheet;
}

beforeEach(() => {
  panelMounted.mockClear();
});

describe("MobileShellFab", () => {
  it("keeps the sheet element mounted before any click, so the slide-up transition has something to animate", () => {
    renderFab();
    expect(sheetElement()).toBeInTheDocument();
  });

  it("advertises no dialog while closed — a permanently-mounted role=dialog reads as an open modal to AT", () => {
    renderFab();
    const sheet = sheetElement();
    expect(sheet).not.toHaveAttribute("role");
    expect(sheet).not.toHaveAttribute("aria-modal");
    expect(sheet).not.toHaveAttribute("aria-label");
    expect(screen.queryAllByRole("dialog", { hidden: true })).toEqual([]);
  });

  it("becomes a labelled modal dialog only once open, and drops the role again on close", async () => {
    renderFab();
    const user = userEvent.setup();
    const trigger = screen.getByRole("button", { name: "Open quick actions" });
    await user.click(trigger);
    const sheet = sheetElement();
    expect(sheet).toHaveAttribute("role", "dialog");
    expect(sheet).toHaveAttribute("aria-modal", "true");
    expect(sheet).toHaveAttribute("aria-label", "Quick actions");
    await user.click(trigger);
    expect(sheet).not.toHaveAttribute("role");
    expect(sheet).not.toHaveAttribute("aria-modal");
  });

  it("opens the dialog when the FAB is clicked", async () => {
    renderFab();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open quick actions" }));
    expect(screen.getByRole("dialog", { hidden: false })).toBeInTheDocument();
  });

  it("mounts FabPanelBody after the RAF fires", async () => {
    renderFab();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open quick actions" }));
    await waitFor(() => {
      expect(screen.getByTestId("fab-panel-body")).toBeInTheDocument();
    });
    expect(panelMounted).toHaveBeenCalledWith(
      expect.objectContaining({ onClose: expect.any(Function) }),
    );
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

  it("passes onClose and onOpenMobileMenu to FabPanelBody", async () => {
    const onOpenMobileMenu = jest.fn();
    render(
      <MobileShellFab
        onOpenMobileMenu={onOpenMobileMenu}
        showAboveBottomNav={false}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open quick actions" }));
    await waitFor(() => {
      expect(panelMounted).toHaveBeenCalledWith(
        expect.objectContaining({ onOpenMobileMenu }),
      );
    });
  });
});
