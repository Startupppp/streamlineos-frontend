import { render, screen } from "@testing-library/react";
import { IntakePage } from "./intake-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api/build", () => ({
  useIntakeRequests: jest.fn(),
  useCreateIntakeRequest: jest.fn(),
  useUpdateIntakeRequest: jest.fn(),
  useProjectMembers: jest.fn(),
  useCycles: jest.fn(),
  useModules: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/features/build/navigation/build-dirty-state-context", () => ({
  useRegisterBuildDirtyState: jest.fn(),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/build/1/intake",
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
    actions,
  }: {
    children: React.ReactNode;
    title?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {actions}
      {children}
    </div>
  ),
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission?: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => (
    <div data-testid="error-state">{description}</div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/illustrations", () => ({
  EmptyInboxIllustration: () => <div />,
}));

jest.mock("@/features/build/intake/intake-item-card", () => ({
  IntakeItemCard: ({
    canManage,
  }: {
    item: unknown;
    canManage?: boolean;
    onAccept: (id: number) => void;
    onDecline: (id: number) => void;
    onDuplicate: (id: number) => void;
  }) => (
    <div
      data-testid="intake-item-card"
      data-can-manage={String(canManage)}
    />
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmStaggerList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({
    ref: _ref,
    ...props
  }: React.HTMLAttributes<HTMLElement> & { ref?: unknown }) => (
    <span {...props} />
  ),
  CheckIcon: ({
    ref: _ref,
    ...props
  }: React.HTMLAttributes<HTMLElement> & { ref?: unknown }) => (
    <span {...props} />
  ),
  XIcon: ({
    ref: _ref,
    ...props
  }: React.HTMLAttributes<HTMLElement> & { ref?: unknown }) => (
    <span {...props} />
  ),
  CopyIcon: ({
    ref: _ref,
    ...props
  }: React.HTMLAttributes<HTMLElement> & { ref?: unknown }) => (
    <span {...props} />
  ),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({
    iconRef: { current: null },
    hoverHandlers: {},
  }),
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetBody: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({
    children,
    isPending: _p,
    loadingText: _l,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isPending?: boolean;
    loadingText?: string;
  }) => <button {...props}>{children}</button>,
}));

jest.mock("lucide-react", () => ({
  Plus: () => <span />,
  ExternalLink: () => <span />,
  Lock: () => <span />,
  ShieldOff: () => <span />,
  Zap: () => <span />,
}));

jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    children,
    value: _v,
    onValueChange: _ovc,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div role="tablist">{children}</div>
  ),
  TabsTrigger: ({
    children,
    value: _v,
  }: {
    children: React.ReactNode;
    value?: string;
  }) => <button role="tab">{children}</button>,
  TabsContent: ({
    children,
    value: _v,
  }: {
    children: React.ReactNode;
    value?: string;
  }) => <div role="tabpanel">{children}</div>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value: _v,
  }: {
    children: React.ReactNode;
    value?: string;
  }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

jest.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    ...props
  }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}));

import {
  useIntakeRequests,
  useCreateIntakeRequest,
  useUpdateIntakeRequest,
  useProjectMembers,
  useCycles,
  useModules,
} from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseIntakeRequests = useIntakeRequests as jest.Mock;
const mockUseCreateIntakeRequest = useCreateIntakeRequest as jest.Mock;
const mockUseUpdateIntakeRequest = useUpdateIntakeRequest as jest.Mock;
const mockUseProjectMembers = useProjectMembers as jest.Mock;
const mockUseCycles = useCycles as jest.Mock;
const mockUseModules = useModules as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

function baseQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockUseCan.mockReturnValue(false);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseIntakeRequests.mockReturnValue(
    baseQueryResult({ data: { data: [] } }),
  );
  mockUseCreateIntakeRequest.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  });
  mockUseUpdateIntakeRequest.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  });
  mockUseProjectMembers.mockReturnValue(baseQueryResult({ data: [] }));
  mockUseCycles.mockReturnValue(baseQueryResult({ data: [] }));
  mockUseModules.mockReturnValue(baseQueryResult({ data: [] }));
});

it("renders NoPermissionState when build:view is denied instead of empty state", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseIntakeRequests.mockReturnValue(baseQueryResult());
  render(<IntakePage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("does not flash denial while the access snapshot is still in flight", () => {
  mockUseAccess.mockReturnValue({ data: undefined, isLoading: true });
  mockUseIntakeRequests.mockReturnValue(baseQueryResult({ isLoading: true }));
  render(<IntakePage projectId={1} />);
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
});

it("offers the upgrade path the backend sent with a 402 rather than a generic error state", () => {
  mockUseIntakeRequests.mockReturnValue(
    baseQueryResult({
      isError: true,
      error: new ApiError(
        "Build is not included in your current plan.",
        402,
        "MODULE_NOT_ENABLED",
        { moduleKey: "build", reason: "not-in-plan", upgradePath: "/settings/billing" },
      ),
    }),
  );
  render(<IntakePage projectId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /plan|billing|upgrade/i }),
  ).toHaveAttribute("href", "/settings/billing");
});

it("hides New Item button when build:workspace:manage is not granted", () => {
  mockUseCan.mockReturnValue(false);
  render(<IntakePage projectId={1} />);
  expect(
    screen.queryByRole("button", { name: /new item/i }),
  ).not.toBeInTheDocument();
});

it("passes canManage=false to IntakeItemCard so action buttons are hidden", () => {
  mockUseCan.mockReturnValue(false);
  mockUseIntakeRequests.mockReturnValue(
    baseQueryResult({
      data: { data: [{ id: 1, title: "Test item", status: "pending" }] },
    }),
  );
  render(<IntakePage projectId={1} />);
  const card = screen.getByTestId("intake-item-card");
  expect(card.getAttribute("data-can-manage")).toBe("false");
});
