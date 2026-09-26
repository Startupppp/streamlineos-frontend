import React from "react";
import { render } from "@testing-library/react";
import { ModulesPage } from "./modules-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/1/modules",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/build", () => ({
  useModulePages: jest.fn(),
  useCreateModule: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("framer-motion", () => ({
  motion: { div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div> },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div>{title ? <h1>{title}</h1> : null}{children}</div>
  ),
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: () => <div data-testid="no-permission" />,
}));
jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));
jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));
jest.mock("@/components/ui/stat-card", () => ({
  StatCard: () => null,
  StatCardGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StatCardGridSkeleton: () => null,
}));
jest.mock("@/features/build/modules/module-card", () => ({
  ModuleCard: ({ module: mod }: { module: { name: string } }) => <div data-testid="module-card">{mod.name}</div>,
  ModuleCardSkeleton: () => null,
}));
jest.mock("@/components/ui/infinite-scroll-sentinel", () => ({ InfiniteScrollSentinel: () => null }));
jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({ ref: _ref, ...props }: React.ComponentPropsWithRef<"span">) => <span {...props} />,
}));
jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/components/ui/date-picker", () => ({ DatePicker: () => null }));
jest.mock("@/components/members/project-member-select", () => ({ ProjectMemberSelect: () => null }));
jest.mock("@/components/ui/emoji-icon-picker", () => ({ EmojiIconPicker: () => null }));
jest.mock("@/components/shared/dirty-state-context", () => ({ useRegisterDirtyState: jest.fn() }));
jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));
jest.mock("@/lib/date-constraints", () => ({
  clearEndIfInvalid: jest.fn((_, end) => end),
  planningStartPickerProps: jest.fn(() => ({ fromDate: undefined, fromYear: 2020, toYear: 2030 })),
  planningEndPickerProps: jest.fn(() => ({ fromDate: undefined, fromYear: 2020, toYear: 2030 })),
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: jest.fn(),
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: () => <div data-testid="build-list-toolbar" />,
}));

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(() => ({ focusedIndex: null, setFocusedIndex: jest.fn() })),
}));

import { useModulePages, useCreateModule } from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";

const mockUseModulePages = useModulePages as jest.Mock;
const mockUseCreateModule = useCreateModule as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseBuildListFilters = useBuildListFilters as jest.Mock;
const mockUseBuildListKeyboard = useBuildListKeyboard as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:view": "all" }, modules: {} },
  isLoading: false,
};

function basePages(data: object) {
  return { data, isLoading: false, isError: false, error: undefined, hasNextPage: false, fetchNextPage: jest.fn(), isFetchingNextPage: false, refetch: jest.fn() };
}

const makeModule = (id: number, name: string, status = "in-progress", leadId: string | null = null) => ({
  id, name, status, leadId, orgId: "org-1", projectId: 7, description: null,
  startDate: null, endDate: null, createdBy: "u1", createdAt: null, updatedAt: null,
});

const defaultFilters = {
  search: "", debouncedSearch: "", cursor: null, setSearch: jest.fn(), setCursor: jest.fn(),
  clearAll: jest.fn(), resetKey: "", value: jest.fn(() => ""), setValue: jest.fn(),
  activeCount: 0, isFiltered: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseCreateModule.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
  mockUseBuildListFilters.mockReturnValue(defaultFilters);
});

it("search filter narrows modules by name and keyboard receives the reduced itemCount", () => {
  mockUseBuildListFilters.mockReturnValue({
    ...defaultFilters, debouncedSearch: "auth", value: jest.fn(() => ""),
  });
  mockUseModulePages.mockReturnValue(
    basePages({ pages: [{ data: [makeModule(1, "Auth Module"), makeModule(2, "Payment Module")] }] }),
  );
  render(<ModulesPage projectId={7} />);
  const lastArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
  expect(lastArgs?.itemCount).toBe(1);
});

it("status filter shows only modules with the matching status reflected in keyboard itemCount", () => {
  mockUseBuildListFilters.mockReturnValue({
    ...defaultFilters, value: jest.fn((k: string) => k === "status" ? "completed" : ""),
  });
  mockUseModulePages.mockReturnValue(
    basePages({ pages: [{ data: [makeModule(1, "Mod A", "in-progress"), makeModule(2, "Mod B", "completed")] }] }),
  );
  render(<ModulesPage projectId={7} />);
  const lastArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
  expect(lastArgs?.itemCount).toBe(1);
});

it("leadId filter shows only modules assigned to the specified lead reflected in keyboard itemCount", () => {
  mockUseBuildListFilters.mockReturnValue({
    ...defaultFilters, value: jest.fn((k: string) => k === "leadId" ? "user-42" : ""),
  });
  mockUseModulePages.mockReturnValue(
    basePages({ pages: [{ data: [makeModule(1, "A", "planned", "user-42"), makeModule(2, "B", "planned", null)] }] }),
  );
  render(<ModulesPage projectId={7} />);
  const lastArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
  expect(lastArgs?.itemCount).toBe(1);
});
