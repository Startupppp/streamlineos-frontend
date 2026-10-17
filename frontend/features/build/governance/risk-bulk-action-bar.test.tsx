import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseCan = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockUseCan(),
}));

jest.mock("lucide-react", () => ({
  X: () => <span data-testid="x-icon" />,
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
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
  }: {
    children: ReactNode;
    onValueChange?: (v: string) => void;
  }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
}));

import { RiskBulkActionBar } from "./risk-bulk-action-bar";

function makeProps(overrides: Partial<React.ComponentProps<typeof RiskBulkActionBar>> = {}) {
  return {
    selectedCount: 3,
    onBulkStatus: jest.fn(),
    onBulkOwner: jest.fn(),
    members: [{ id: "u1", name: "Alice", email: "alice@test.com" }],
    onClear: jest.fn(),
    ...overrides,
  };
}

describe("RiskBulkActionBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when build:risks:manage is not granted", () => {
    mockUseCan.mockReturnValue(false);
    const { container } = render(<RiskBulkActionBar {...makeProps()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the selected count badge when permission is granted", () => {
    mockUseCan.mockReturnValue(true);
    render(<RiskBulkActionBar {...makeProps({ selectedCount: 3 })} />);
    expect(screen.getByTestId("badge")).toHaveTextContent("3 selected");
  });

  it("shows updated count when selectedCount changes", () => {
    mockUseCan.mockReturnValue(true);
    render(<RiskBulkActionBar {...makeProps({ selectedCount: 7 })} />);
    expect(screen.getByTestId("badge")).toHaveTextContent("7 selected");
  });

  it("renders all five risk status options", () => {
    mockUseCan.mockReturnValue(true);
    render(<RiskBulkActionBar {...makeProps()} />);
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Mitigating")).toBeInTheDocument();
    expect(screen.getByText("Monitoring")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("renders member name in the owner select", () => {
    mockUseCan.mockReturnValue(true);
    render(<RiskBulkActionBar {...makeProps()} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("falls back to email when member has no name", () => {
    mockUseCan.mockReturnValue(true);
    render(
      <RiskBulkActionBar
        {...makeProps({
          members: [{ id: "u2", name: null, email: "bob@test.com" }],
        })}
      />,
    );
    expect(screen.getByText("bob@test.com")).toBeInTheDocument();
  });

  it("calls onClear when the clear button is clicked", () => {
    mockUseCan.mockReturnValue(true);
    const onClear = jest.fn();
    render(<RiskBulkActionBar {...makeProps({ onClear })} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("renders the Set Status and Assign Owner placeholders", () => {
    mockUseCan.mockReturnValue(true);
    render(<RiskBulkActionBar {...makeProps()} />);
    expect(screen.getByText("Set Status")).toBeInTheDocument();
    expect(screen.getByText("Assign Owner")).toBeInTheDocument();
  });
});
