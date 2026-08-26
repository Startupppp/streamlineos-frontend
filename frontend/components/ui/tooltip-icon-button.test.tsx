import * as React from "react";
import { render, screen } from "@testing-library/react";
import { TooltipIconButton } from "./tooltip-icon-button";

jest.mock("./tooltip", () => ({
  Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
  TooltipTrigger: ({
    children,
    asChild,
    ...props
  }: React.PropsWithChildren<{ asChild?: boolean }>) =>
    asChild ? (
      React.isValidElement(children) ? (
        React.cloneElement(children as React.ReactElement, props)
      ) : (
        <span {...props}>{children}</span>
      )
    ) : (
      <span {...props}>{children}</span>
    ),
  TooltipContent: ({ children }: React.PropsWithChildren) => (
    <div role="tooltip">{children}</div>
  ),
}));

jest.mock("./animated-icon-button", () => ({
  AnimatedIconButton: React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      icon?: unknown;
      iconSize?: number;
      iconClassName?: string;
    }
  >(function AnimatedIconButton({ icon: _icon, iconSize: _s, iconClassName: _c, children, ...props }, ref) {
    return (
      <button ref={ref} {...props}>
        {children}
      </button>
    );
  }),
}));

const MockIcon = React.forwardRef<Record<string, unknown>, Record<string, unknown>>(
  function MockIcon(_props, _ref) {
    return <svg aria-hidden="true" />;
  },
);

describe("TooltipIconButton — accessible name", () => {
  it("exposes the label as aria-label so screen readers announce the action", () => {
    render(<TooltipIconButton label="Delete record" icon={MockIcon} />);
    expect(screen.getByRole("button", { name: "Delete record" })).toBeInTheDocument();
  });

  it("is a button element so keyboard users can Tab to it and activate it with Enter", () => {
    render(<TooltipIconButton label="Archive" icon={MockIcon} />);
    expect(screen.getByRole("button", { name: "Archive" }).tagName).toBe("BUTTON");
  });

  it("renders the tooltip text alongside the button so sighted mouse users also see the label", () => {
    render(<TooltipIconButton label="Export CSV" icon={MockIcon} />);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Export CSV");
  });

  it("passes through disabled so AT can announce the control is unavailable", () => {
    render(<TooltipIconButton label="Submit" icon={MockIcon} disabled />);
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("renders children when no icon is supplied, still with aria-label", () => {
    render(<TooltipIconButton label="Settings">⚙</TooltipIconButton>);
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });
});
