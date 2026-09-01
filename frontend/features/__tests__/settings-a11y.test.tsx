import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { atViewport } from "@/test-utils/viewport";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

jest.mock("@animateicons/react/lucide", () => ({
  Trash2Icon: ({ size: _s, ...rest }: { size?: number; [k: string]: unknown }) => (
    <svg aria-hidden="true" {...rest} />
  ),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) =>
    e instanceof Error ? e.message : String(e ?? "Unknown error"),
}));

jest.mock("@/lib/list-pagination", () => ({
  STANDARD_PAGE_SIZE_OPTIONS: [10, 25, 50],
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <h2 className={className}>{children}</h2>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <span className={className}>{children}</span>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    variant: _variant,
    size: _size,
    disabled,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button type="button" onClick={onClick} className={className} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div className={className} aria-hidden="true" />
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({
    title,
    description,
    filtersActive,
    onClearFilters,
  }: {
    title: string;
    description?: string;
    filtersActive?: boolean;
    onClearFilters?: () => void;
    illustrationPreset?: string;
    compact?: boolean;
    className?: string;
  }) => (
    <div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {filtersActive && onClearFilters && (
        <button type="button" onClick={onClearFilters}>Clear filters</button>
      )}
    </div>
  ),
}));

jest.mock("@/components/shared/data-table-pagination", () => ({
  DataTablePagination: ({
    page,
    totalPages,
    onPageChange,
    onLimitChange: _lc,
    total: _t,
    limit: _l,
    pageSizeOptions: _po,
  }: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (p: number) => void;
    onLimitChange: (l: number) => void;
    pageSizeOptions?: number[];
  }) => (
    <nav aria-label="Pagination">
      <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        Prev
      </button>
      <span>Page {page} of {totalPages}</span>
      <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
        Next
      </button>
    </nav>
  ),
}));

import { RolesListPanel, type RolesListPanelProps } from "@/features/settings/roles/roles-list-panel";
import type { RoleListRow } from "@/hooks/api/roles";

const NOW = new Date("2026-01-01T00:00:00Z");

const MOCK_ROLES: RoleListRow[] = [
  {
    id: 1,
    orgId: "org-1",
    name: "HR Admin",
    slug: "HR_ADMIN",
    isSystem: true,
    version: 1,
    permissionCount: 45,
    memberCount: 3,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 2,
    orgId: "org-1",
    name: "Custom Viewer",
    slug: "CUSTOM_VIEWER",
    isSystem: false,
    version: 1,
    permissionCount: 12,
    memberCount: 1,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const BASE_PAGINATION = { page: 1, totalPages: 1, total: 2, limit: 10 };

function makeProps(overrides: Partial<RolesListPanelProps> = {}): RolesListPanelProps {
  return {
    isLoading: false,
    rolesError: false,
    rolesQueryError: null,
    roles: MOCK_ROLES,
    search: "",
    pagination: BASE_PAGINATION,
    selectedRoleId: null,
    onRetry: jest.fn(),
    onSelect: jest.fn(),
    onDelete: jest.fn(),
    onRename: jest.fn(),
    onPageChange: jest.fn(),
    onPageSizeChange: jest.fn(),
    onClearSearch: jest.fn(),
    ...overrides,
  };
}

describe("a11y — Settings surface (RolesListPanel — selected and rename flows)", () => {
  it("passes axe with selected role at 1280px", async () => {
    const restore = atViewport("desktop");
    try {
      const { baseElement } = render(<RolesListPanel {...makeProps({ selectedRoleId: 1 })} />);
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("selected role wrapper has distinguishing css class", () => {
    render(<RolesListPanel {...makeProps({ selectedRoleId: 1 })} />);
    const hrAdminBtn = screen.getByRole("button", { name: "Select HR Admin role" });
    const wrapper = hrAdminBtn.parentElement;
    expect(wrapper?.className).toMatch(/border-primary|bg-primary/);
  });

  it("rename button calls onRename with role data", () => {
    const onRename = jest.fn();
    render(<RolesListPanel {...makeProps({ onRename })} />);
    fireEvent.click(screen.getByRole("button", { name: "Rename role" }));
    expect(onRename).toHaveBeenCalledWith(expect.objectContaining({ id: 2, name: "Custom Viewer" }));
  });

  it("BITE PROOF (viewport 375px) — both roles visible in mobile viewport", () => {
    const restore = atViewport("mobile");
    try {
      render(<RolesListPanel {...makeProps()} />);
      expect(screen.getByText("HR Admin")).toBeInTheDocument();
      expect(screen.getByText("Custom Viewer")).toBeInTheDocument();
    } finally {
      restore();
    }
  });
});
