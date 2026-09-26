import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProjectSettingsIterationsPage } from "./project-settings-iterations-page";

type MockPageState = "ready" | "denied" | "loading" | "error";

let mockPageState: MockPageState = "ready";

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => mockPageState,
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    children,
    loading,
    onRetry,
  }: {
    resolution: MockPageState;
    children: React.ReactNode;
    loading?: React.ReactNode;
    onRetry?: () => void;
  }) => {
    if (resolution === "denied") return <div data-testid="no-permission" />;
    if (resolution === "loading") return <div data-testid="page-loading">{loading}</div>;
    if (resolution === "error") {
      return (
        <div data-testid="error-state">
          <button onClick={onRetry}>Retry</button>
        </div>
      );
    }
    return <div>{children}</div>;
  },
}));

jest.mock("@/hooks/api/build/iteration-settings", () => ({
  useIterationSettings: jest.fn(),
  useUpdateIterationSettings: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "fill-panel",
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange, disabled }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
    disabled?: boolean;
  }) => (
    <div>
      <select
        data-testid="duration-select"
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange?.(e.target.value)}
        aria-label="Default cycle length"
      >
        <option value="1">1 week</option>
        <option value="2">2 weeks</option>
        <option value="3">3 weeks</option>
        <option value="4">4 weeks</option>
      </select>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({ children, isPending: _p, loadingText: _lt, ...props }:
    React.ButtonHTMLAttributes<HTMLButtonElement> & { isPending?: boolean; loadingText?: string }) => (
    <button {...props}>{children}</button>
  ),
}));

import { useIterationSettings, useUpdateIterationSettings } from "@/hooks/api/build/iteration-settings";
import { useCan } from "@/hooks/api/access";
import type { IterationSettings } from "@/hooks/api/build/iteration-settings-schema";

const mockUseIterationSettings = useIterationSettings as jest.Mock;
const mockUseUpdateIterationSettings = useUpdateIterationSettings as jest.Mock;
const mockUseCan = useCan as jest.Mock;

const SETTINGS: IterationSettings = {
  defaultDurationWeeks: 2,
  namingPrefix: "Cycle",
};

const mockMutate = jest.fn();

beforeEach(() => {
  mockPageState = "ready";
  mockUseCan.mockReturnValue(true);
  mockUseIterationSettings.mockReturnValue({
    data: SETTINGS,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUseUpdateIterationSettings.mockReturnValue({ mutate: mockMutate, isPending: false });
  mockMutate.mockClear();
});

it("renders no-permission state and not the form when page state is denied", () => {
  mockPageState = "denied";
  mockUseCan.mockReturnValue(false);
  render(<ProjectSettingsIterationsPage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByLabelText("Naming prefix")).not.toBeInTheDocument();
});

it("renders error state when settings fetch fails", () => {
  mockPageState = "error";
  render(<ProjectSettingsIterationsPage projectId={1} />);
  expect(screen.getByTestId("error-state")).toBeInTheDocument();
});

it("does not show denial state while the access snapshot is still loading", () => {
  mockPageState = "loading";
  render(<ProjectSettingsIterationsPage projectId={1} />);
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
  expect(screen.getByTestId("page-loading")).toBeInTheDocument();
});

it("renders the duration select and naming prefix input with loaded settings values", () => {
  render(<ProjectSettingsIterationsPage projectId={1} />);
  expect(screen.getByTestId("duration-select")).toBeInTheDocument();
  expect(screen.getByLabelText("Naming prefix")).toBeInTheDocument();
  expect((screen.getByLabelText("Naming prefix") as HTMLInputElement).value).toBe("Cycle");
});

it("calls the update mutation with changed form values on save", async () => {
  render(<ProjectSettingsIterationsPage projectId={1} />);
  const nameInput = screen.getByLabelText("Naming prefix") as HTMLInputElement;
  fireEvent.change(nameInput, { target: { value: "Sprint" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => {
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ namingPrefix: "Sprint" }),
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });
});

it("hides the save button when the user lacks build:update permission", () => {
  mockUseCan.mockReturnValue(false);
  render(<ProjectSettingsIterationsPage projectId={1} />);
  expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
});

it("disables form fields while the mutation is pending", () => {
  mockUseUpdateIterationSettings.mockReturnValue({ mutate: mockMutate, isPending: true });
  render(<ProjectSettingsIterationsPage projectId={1} />);
  expect((screen.getByTestId("duration-select") as HTMLSelectElement).disabled).toBe(true);
  expect((screen.getByLabelText("Naming prefix") as HTMLInputElement).disabled).toBe(true);
});

it("has no data table or paginated list — singleton settings form satisfies box 4 by absence of a growable collection", () => {
  render(<ProjectSettingsIterationsPage projectId={1} />);
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  expect(screen.getByTestId("duration-select")).toBeInTheDocument();
  expect(screen.getByLabelText("Naming prefix")).toBeInTheDocument();
});
