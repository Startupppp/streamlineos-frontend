import { render, screen, fireEvent } from "@testing-library/react";
import { GrantFormDialog } from "./grant-form-dialog";

jest.mock("@/components/shared/app-dialog", () => ({
  AppDialog: ({
    open,
    children,
    footer,
    title,
  }: {
    open: boolean;
    children: React.ReactNode;
    footer: React.ReactNode;
    title: string;
  }) =>
    open ? (
      <div data-testid="app-dialog">
        <span data-testid="dialog-title">{title}</span>
        {children}
        {footer}
      </div>
    ) : null,
}));

jest.mock("@/components/ui/form", () => ({
  Form: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormField: ({
    render: renderFn,
  }: {
    render: (args: {
      field: { value: string; onChange: () => void; name: string };
    }) => React.ReactNode;
  }) =>
    renderFn({
      field: { value: "", onChange: jest.fn(), name: "" },
    }),
  FormItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormLabel: ({ children }: { children: React.ReactNode }) => (
    <label>{children}</label>
  ),
  FormControl: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  FormMessage: () => null,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    disabled,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => <div data-testid="select" data-disabled={disabled}>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-testid={`select-item-${value}`}>{children}</div>,
}));

jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: () => <input type="checkbox" />,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    type,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    type?: string;
    disabled?: boolean;
  }) => (
    <button
      type={(type as "button" | "submit" | "reset") ?? "button"}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({
    children,
    isPending,
  }: {
    children: React.ReactNode;
    isPending: boolean;
  }) => <button type="submit" disabled={isPending}>{children}</button>,
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const mockUsePortalMemberships = jest.fn();
const mockUseCreateGrant = jest.fn();
const mockUseUpdateGrant = jest.fn();
const mockUseProjects = jest.fn();
const mockUseInviteClient = jest.fn();

jest.mock("@/hooks/api/portal-access/grants", () => ({
  usePortalMemberships: (...args: unknown[]) => mockUsePortalMemberships(...args),
  useCreateGrant: () => mockUseCreateGrant(),
  useUpdateGrant: (...args: unknown[]) => mockUseUpdateGrant(...args),
  useInviteClient: () => mockUseInviteClient(),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProjects: (...args: unknown[]) => mockUseProjects(...args),
}));

jest.mock("./invite-client-dialog", () => ({
  InviteClientDialog: ({
    open,
    onOpenChange: _onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
  }) =>
    open ? <div data-testid="invite-client-dialog" /> : null,
}));

const POPULATED_MEMBERSHIPS = {
  data: {
    data: [
      {
        portalMembershipId: "pm-1",
        contactFirstName: "Alice",
        contactLastName: "Smith",
        status: "ACTIVE",
      },
    ],
  },
  isLoading: false,
};
const EMPTY_MEMBERSHIPS = { data: { data: [] }, isLoading: false };
const LOADING_MEMBERSHIPS = { data: undefined, isLoading: true };

const POPULATED_PROJECTS = {
  data: {
    data: [
      { id: 1, name: "Alpha" },
      { id: 2, name: "Beta" },
    ],
  },
  isLoading: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCreateGrant.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateGrant.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseInviteClient.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseProjects.mockReturnValue(POPULATED_PROJECTS);
  mockUsePortalMemberships.mockReturnValue(POPULATED_MEMBERSHIPS);
});

describe("GrantFormDialog — membership empty state", () => {
  it("shows the invite CTA when there are no active memberships and mode is create so the user is not left at a dead-end", () => {
    mockUsePortalMemberships.mockReturnValue(EMPTY_MEMBERSHIPS);
    render(
      <GrantFormDialog open mode="create" onOpenChange={jest.fn()} />,
    );
    expect(screen.getByText(/invite a client/i)).toBeInTheDocument();
  });

  it("does not show the invite CTA when memberships exist so the dropdown is the primary path", () => {
    mockUsePortalMemberships.mockReturnValue(POPULATED_MEMBERSHIPS);
    render(
      <GrantFormDialog open mode="create" onOpenChange={jest.fn()} />,
    );
    expect(screen.queryByText(/invite a client/i)).not.toBeInTheDocument();
  });

  it("does not show the invite CTA while memberships are loading so the user does not see a flash of the invite path before data arrives", () => {
    mockUsePortalMemberships.mockReturnValue(LOADING_MEMBERSHIPS);
    render(
      <GrantFormDialog open mode="create" onOpenChange={jest.fn()} />,
    );
    expect(screen.queryByText(/invite a client/i)).not.toBeInTheDocument();
  });

  it("opens the InviteClientDialog when the invite CTA is clicked", () => {
    mockUsePortalMemberships.mockReturnValue(EMPTY_MEMBERSHIPS);
    render(
      <GrantFormDialog open mode="create" onOpenChange={jest.fn()} />,
    );
    fireEvent.click(screen.getByText(/invite a client/i));
    expect(screen.getByTestId("invite-client-dialog")).toBeInTheDocument();
  });
});

describe("GrantFormDialog — project picker", () => {
  it("renders project options from useProjects so the user selects by name not raw ID", () => {
    render(
      <GrantFormDialog open mode="create" onOpenChange={jest.fn()} />,
    );
    expect(screen.getByTestId("select-item-1")).toBeInTheDocument();
    expect(screen.getByTestId("select-item-2")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("does not render a raw number input for project ID so the FE-85 visible-raw-ID bug is gone", () => {
    render(
      <GrantFormDialog open mode="create" onOpenChange={jest.fn()} />,
    );
    const numberInputs = screen
      .queryAllByRole("spinbutton")
      .filter((el) => el.getAttribute("name") === "projectId");
    expect(numberInputs).toHaveLength(0);
  });
});

describe("GrantFormDialog — membership query filter", () => {
  it("queries with status ACTIVE so PENDING memberships are excluded from the dropdown since grants require an active membership", () => {
    render(
      <GrantFormDialog open mode="create" onOpenChange={jest.fn()} />,
    );
    expect(mockUsePortalMemberships).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ACTIVE" }),
      expect.objectContaining({ enabled: true }),
    );
  });
});

describe("GrantFormDialog — projects load failure (BUG-006)", () => {
  it("shows Projects Error with Try Again and does not leave the project field silent", () => {
    const refetch = jest.fn();
    mockUseProjects.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });
    mockUsePortalMemberships.mockReturnValue(POPULATED_MEMBERSHIPS);
    render(
      <GrantFormDialog open onOpenChange={jest.fn()} mode="create" />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/Projects Error/i);
    expect(screen.getByText(/Failed to load projects/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Try Again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("NEGATIVE — success path does not show Projects Error", () => {
    render(
      <GrantFormDialog open onOpenChange={jest.fn()} mode="create" />,
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/Projects Error/i)).toBeNull();
  });
});
