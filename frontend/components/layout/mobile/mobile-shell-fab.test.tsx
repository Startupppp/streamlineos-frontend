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

beforeEach(() => {
  panelMounted.mockClear();
});

describe("MobileShellFab", () => {
  it("renders the sheet in the DOM before any click (always mounted)", () => {
    renderFab();
    expect(screen.getByRole("dialog", { hidden: true })).toBeInTheDocument();
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
