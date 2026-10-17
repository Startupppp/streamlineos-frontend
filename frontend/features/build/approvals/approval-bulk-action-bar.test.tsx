import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

const mockUseCan = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockUseCan(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children?: ReactNode;
    onClick?: () => void;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({
    children,
    onClick,
    isPending,
  }: {
    children?: ReactNode;
    onClick?: () => void;
    isPending?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-busy={isPending}
      disabled={isPending}
    >
      {isPending ? "Cancelling…" : children}
    </button>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PM_TOOLBAR: "pm-toolbar",
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

jest.mock("lucide-react", () => ({
  X: () => <svg data-testid="x-icon" />,
}));

import { ApprovalBulkActionBar } from "./approval-bulk-action-bar";

function defaultProps(overrides?: Partial<React.ComponentProps<typeof ApprovalBulkActionBar>>) {
  return {
    selectedCount: 3,
    isPending: false,
    onCancelSelected: jest.fn(),
    onClear: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(true);
});

describe("ApprovalBulkActionBar — permission gate (FE-44)", () => {
  it("does not render when canManage is false — permission gate fails closed", () => {
    mockUseCan.mockReturnValue(false);
    const { container } = render(<ApprovalBulkActionBar {...defaultProps()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the bar when canManage is true — positive control confirms gate does not over-block", () => {
    mockUseCan.mockReturnValue(true);
    render(<ApprovalBulkActionBar {...defaultProps({ selectedCount: 2 })} />);
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });
});

describe("ApprovalBulkActionBar — selection count display", () => {
  it("shows the exact selected count passed via props", () => {
    render(<ApprovalBulkActionBar {...defaultProps({ selectedCount: 5 })} />);
    expect(screen.getByText("5 selected")).toBeInTheDocument();
  });
});

describe("ApprovalBulkActionBar — cancel action", () => {
  it("renders the Cancel selected button", () => {
    render(<ApprovalBulkActionBar {...defaultProps()} />);
    expect(screen.getByRole("button", { name: /cancel selected/i })).toBeInTheDocument();
  });

  it("calls onCancelSelected when the cancel button is clicked", async () => {
    const onCancelSelected = jest.fn();
    const user = userEvent.setup();
    render(<ApprovalBulkActionBar {...defaultProps({ onCancelSelected })} />);
    await user.click(screen.getByRole("button", { name: /cancel selected/i }));
    expect(onCancelSelected).toHaveBeenCalledTimes(1);
  });

  it("disables the cancel button and shows loading text while isPending is true", () => {
    render(<ApprovalBulkActionBar {...defaultProps({ isPending: true })} />);
    const btn = screen.getByRole("button", { name: /cancelling/i });
    expect(btn).toBeDisabled();
  });
});

describe("ApprovalBulkActionBar — clear selection", () => {
  it("renders a Clear selection button", () => {
    render(<ApprovalBulkActionBar {...defaultProps()} />);
    expect(screen.getByRole("button", { name: /clear selection/i })).toBeInTheDocument();
  });

  it("calls onClear when the X button is clicked", async () => {
    const onClear = jest.fn();
    const user = userEvent.setup();
    render(<ApprovalBulkActionBar {...defaultProps({ onClear })} />);
    await user.click(screen.getByRole("button", { name: /clear selection/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
