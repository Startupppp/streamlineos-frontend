import { render, screen, fireEvent } from "@testing-library/react";
import { BuildScopeRecovery } from "./build-scope-recovery";
import {
  DirtyStateProvider,
  useRegisterDirtyState,
} from "@/components/shared/dirty-state-context";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    onClick,
    className,
    "aria-label": ariaLabel,
    title,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
    className?: string;
    "aria-label"?: string;
    title?: string;
  }) => (
    <a href={href} onClick={onClick} className={className} aria-label={ariaLabel} title={title}>
      {children}
    </a>
  ),
}));

describe("BSN-04-A06 — no-access fallback renders nothing so no misleading recovery link is offered", () => {
  it("renders nothing when fallback kind is no-access so the sidebar shows an empty state and no recovery destination", () => {
    const { container } = render(
      <BuildScopeRecovery fallback={{ kind: "no-access" }} isCollapsed={false} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders nothing when fallback kind is stay so no spurious warning is shown while the scope is accessible", () => {
    const { container } = render(
      <BuildScopeRecovery fallback={{ kind: "stay" }} isCollapsed={false} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders a named recovery link when fallback kind is recover — proves the no-access assertions are not vacuous", () => {
    render(
      <BuildScopeRecovery
        fallback={{ kind: "recover", href: "/build/command-center", label: "Go to All of Build" }}
        isCollapsed={false}
      />,
    );
    expect(screen.getByRole("link", { name: "Go to All of Build" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Go to All of Build" }).getAttribute("href"),
    ).toBe("/build/command-center");
  });

  it("renders no recovery link in collapsed mode when fallback kind is no-access", () => {
    const { container } = render(
      <BuildScopeRecovery fallback={{ kind: "no-access" }} isCollapsed={true} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders a recovery link in collapsed mode when fallback kind is recover — confirms both render paths are covered", () => {
    render(
      <BuildScopeRecovery
        fallback={{ kind: "recover", href: "/build/workspaces/ws-1", label: "Go to the parent workspace" }}
        isCollapsed={true}
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/build/workspaces/ws-1");
  });
});

const RECOVER_FALLBACK = {
  kind: "recover" as const,
  href: "/build/command-center",
  label: "Go to All of Build",
};

function DirtySurface({ isDirty }: { isDirty: boolean }) {
  useRegisterDirtyState(isDirty);
  return null;
}

function renderExpandedRecovery(isDirty: boolean) {
  return render(
    <DirtyStateProvider>
      <DirtySurface isDirty={isDirty} />
      <BuildScopeRecovery fallback={RECOVER_FALLBACK} isCollapsed={false} />
    </DirtyStateProvider>,
  );
}

describe("BSN-04-014 — the scope recovery link is the one navigation path that used to escape the unsaved-work guard", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("navigates immediately when no Build surface holds unsaved work", () => {
    renderExpandedRecovery(false);

    fireEvent.click(screen.getByRole("link", { name: "Go to All of Build" }));

    expect(push).toHaveBeenCalledWith("/build/command-center");
  });

  it("blocks navigation and prompts when a Build surface is dirty, instead of losing the draft silently", () => {
    renderExpandedRecovery(true);

    fireEvent.click(screen.getByRole("link", { name: "Go to All of Build" }));

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("navigates once the user discards, without double navigation", () => {
    renderExpandedRecovery(true);

    fireEvent.click(screen.getByRole("link", { name: "Go to All of Build" }));
    fireEvent.click(screen.getByRole("button", { name: /discard/i }));

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/build/command-center");
  });

  it("leaves a modifier-click to the browser so opening the recovery link in a new tab still works", () => {
    renderExpandedRecovery(true);

    fireEvent.click(screen.getByRole("link", { name: "Go to All of Build" }), {
      metaKey: true,
    });

    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("guards the collapsed-icon recovery link the same way as the expanded panel link", () => {
    render(
      <DirtyStateProvider>
        <DirtySurface isDirty={true} />
        <BuildScopeRecovery fallback={RECOVER_FALLBACK} isCollapsed={true} />
      </DirtyStateProvider>,
    );

    fireEvent.click(screen.getByRole("link"));

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
