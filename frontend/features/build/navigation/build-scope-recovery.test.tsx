import { render, screen } from "@testing-library/react";
import { BuildScopeRecovery } from "./build-scope-recovery";

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
    onClick?: () => void;
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
