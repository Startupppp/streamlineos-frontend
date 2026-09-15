import type { PropsWithChildren } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setViewport } from "@/test-utils/viewport";

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1" } }),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: { isOrgOwner: true }, isLoading: false }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgSettings: () => ({
    data: { onboardingCompletedAt: "2026-01-01T00:00:00.000Z" },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/common/use-workspace-checklist-progress", () => ({
  useWorkspaceChecklistProgress: jest.fn((_enabled?: boolean) => ({
    completed: new Set<string>(),
    doneCount: 1,
    isLoading: false,
  })),
}));

jest.mock("framer-motion", () => {
  const React = jest.requireActual<typeof import("react")>("react");

  function stripMotionProps(props: Record<string, unknown>) {
    const {
      animate: _animate,
      exit: _exit,
      initial: _initial,
      transition: _transition,
      variants: _variants,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...rest
    } = props;
    return rest;
  }

  function MotionDiv({ children, ...props }: PropsWithChildren<Record<string, unknown>>) {
    return React.createElement("div", stripMotionProps(props), children);
  }

  function MotionSpan({ children, ...props }: PropsWithChildren<Record<string, unknown>>) {
    return React.createElement("span", stripMotionProps(props), children);
  }

  function MotionButton({ children, ...props }: PropsWithChildren<Record<string, unknown>>) {
    return React.createElement("button", stripMotionProps(props), children);
  }

  function MotionCircle(props: Record<string, unknown>) {
    return React.createElement("circle", stripMotionProps(props));
  }

  return {
    motion: {
      div: MotionDiv,
      span: MotionSpan,
      button: MotionButton,
      circle: MotionCircle,
    },
    AnimatePresence: ({ children }: PropsWithChildren) => children,
    useReducedMotion: () => true,
  };
});

import { SuccessChecklist } from "./success-checklist";
import { useWorkspaceChecklistProgress } from "@/hooks/common/use-workspace-checklist-progress";

const mockUseWorkspaceChecklistProgress = jest.mocked(
  useWorkspaceChecklistProgress,
);

function mountMobileHeaderSlot(): void {
  const slot = document.createElement("div");
  slot.id = "mobile-header-checklist-slot";
  document.body.appendChild(slot);
}

function mobileChrome(): HTMLElement {
  const slot = document.getElementById("mobile-header-checklist-slot");
  if (!slot) throw new Error("the mobile header slot is not mounted");
  return slot;
}

let restoreViewport: () => void = () => {};

beforeEach(() => {
  localStorage.clear();
  mockUseWorkspaceChecklistProgress.mockClear();
  mountMobileHeaderSlot();
});

afterEach(() => {
  restoreViewport();
  restoreViewport = () => {};
  document.body.innerHTML = "";
});

describe("SuccessChecklist below md", () => {
  beforeEach(() => {
    restoreViewport = setViewport(375);
  });

  it("starts collapsed, so its panel cannot own the pixels of the page controls beneath it", () => {
    render(<SuccessChecklist />);
    expect(screen.queryAllByText("Getting Started")).toEqual([]);
    expect(screen.queryAllByText("Invite your first teammate")).toEqual([]);
  });

  it("keeps the collapsed affordance discoverable and reports its state", () => {
    render(<SuccessChecklist />);
    const trigger = within(mobileChrome()).getByRole("button", {
      name: "Open getting started checklist",
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(mockUseWorkspaceChecklistProgress).toHaveBeenLastCalledWith(false);
  });

  it("opens on demand and closes again from the panel's own control", async () => {
    render(<SuccessChecklist />);
    const user = userEvent.setup();
    await user.click(
      within(mobileChrome()).getByRole("button", {
        name: "Open getting started checklist",
      }),
    );
    expect(mockUseWorkspaceChecklistProgress).toHaveBeenLastCalledWith(true);
    const scope = within(mobileChrome());
    expect(scope.getByText("Getting Started")).toBeInTheDocument();
    const collapseControls = scope.getAllByRole("button", {
      name: "Collapse checklist",
    });
    await user.click(collapseControls[collapseControls.length - 1]);
    expect(screen.queryAllByText("Getting Started")).toEqual([]);
  });
});

describe("SuccessChecklist at md and above", () => {
  beforeEach(() => {
    restoreViewport = setViewport(1280);
  });

  it("starts collapsed without loading progress", () => {
    render(<SuccessChecklist />);
    expect(screen.queryAllByText("Getting Started")).toEqual([]);
    expect(mockUseWorkspaceChecklistProgress).toHaveBeenLastCalledWith(false);
  });

  it("loads progress on demand and can be collapsed to the progress FAB", async () => {
    render(<SuccessChecklist />);
    const user = userEvent.setup();
    await user.click(
      screen.getAllByRole("button", {
        name: "Open getting started checklist",
      })[0],
    );
    expect(screen.getAllByText("Getting Started").length).toBeGreaterThan(0);
    expect(mockUseWorkspaceChecklistProgress).toHaveBeenLastCalledWith(true);
    await user.click(screen.getAllByRole("button", { name: "Collapse checklist" })[0]);
    expect(screen.queryAllByText("Getting Started")).toEqual([]);
  });
});
