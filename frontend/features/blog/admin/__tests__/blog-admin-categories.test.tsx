import React from "react";
import { screen } from "@testing-library/react";
import { renderWithProviders, expectNoAxeViolations, atViewport } from "@/test-utils";
import { BlogAdminCategories } from "../blog-admin-categories";
import type { AdminBlogCategory } from "@/hooks/api/blog-admin";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
}));

jest.mock("@/hooks/api/blog-admin", () => ({
  useAdminBlogCategories: jest.fn(),
  useCreateBlogCategory: jest.fn(),
  useUpdateBlogCategory: jest.fn(),
  useDeleteBlogCategory: jest.fn(),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: React.forwardRef(function PlusIconStub(
    _props: unknown,
    _ref: unknown,
  ) {
    return <svg aria-hidden="true" />;
  }),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: React.forwardRef(function AnimatedIconButtonStub(
    { children, onClick, "aria-label": ariaLabel }: { children?: React.ReactNode; onClick?: () => void; "aria-label"?: string },
    _ref: unknown,
  ) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel}>
        {children}
      </button>
    );
  }),
}));

type UseAdminBlogCategoriesReturn = {
  data: AdminBlogCategory[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: jest.Mock;
};

const {
  useAdminBlogCategories,
  useCreateBlogCategory,
  useUpdateBlogCategory,
  useDeleteBlogCategory,
} = jest.requireMock("@/hooks/api/blog-admin") as {
  useAdminBlogCategories: jest.MockedFunction<() => UseAdminBlogCategoriesReturn>;
  useCreateBlogCategory: jest.MockedFunction<() => { mutate: jest.Mock; isPending: boolean }>;
  useUpdateBlogCategory: jest.MockedFunction<() => { mutate: jest.Mock; isPending: boolean }>;
  useDeleteBlogCategory: jest.MockedFunction<() => { mutate: jest.Mock; isPending: boolean }>;
};

const CATEGORIES: AdminBlogCategory[] = [
  { id: "cat-1", name: "Engineering", description: "Tech articles", color: "#3b82f6", postCount: 5 },
  { id: "cat-2", name: "Product", description: null, color: null, postCount: 2 },
];

const DEFAULT_RETURN: UseAdminBlogCategoriesReturn = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

beforeEach(() => {
  useAdminBlogCategories.mockReturnValue({ ...DEFAULT_RETURN });
  useCreateBlogCategory.mockReturnValue({ mutate: jest.fn(), isPending: false });
  useUpdateBlogCategory.mockReturnValue({ mutate: jest.fn(), isPending: false });
  useDeleteBlogCategory.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

afterEach(() => jest.clearAllMocks());

describe("BlogAdminCategories", () => {
  it("shows skeleton while loading", () => {
    useAdminBlogCategories.mockReturnValue({ ...DEFAULT_RETURN, isLoading: true });
    renderWithProviders(<BlogAdminCategories />);
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows empty state when no categories", () => {
    useAdminBlogCategories.mockReturnValue({ ...DEFAULT_RETURN, data: [] });
    renderWithProviders(<BlogAdminCategories />);
    expect(screen.getByText("No categories")).toBeInTheDocument();
  });

  it("shows error state when query fails", () => {
    useAdminBlogCategories.mockReturnValue({
      ...DEFAULT_RETURN,
      isError: true,
      error: new Error("Server error"),
    });
    renderWithProviders(<BlogAdminCategories />);
    expect(screen.getByText("Couldn't load categories")).toBeInTheDocument();
  });

  it("renders category names when data is present", () => {
    useAdminBlogCategories.mockReturnValue({ ...DEFAULT_RETURN, data: CATEGORIES });
    renderWithProviders(<BlogAdminCategories />);
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Product")).toBeInTheDocument();
  });

  it("renders post count badges", () => {
    useAdminBlogCategories.mockReturnValue({ ...DEFAULT_RETURN, data: CATEGORIES });
    renderWithProviders(<BlogAdminCategories />);
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
  });

  it("shows colour hex for category with a color", () => {
    useAdminBlogCategories.mockReturnValue({ ...DEFAULT_RETURN, data: CATEGORIES });
    renderWithProviders(<BlogAdminCategories />);
    expect(screen.getByText("#3b82f6")).toBeInTheDocument();
  });

  it("shows em dash for category with no color", () => {
    useAdminBlogCategories.mockReturnValue({ ...DEFAULT_RETURN, data: CATEGORIES });
    renderWithProviders(<BlogAdminCategories />);
    const dashElements = screen.getAllByText("—");
    expect(dashElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Add category button when canManage is true", () => {
    useAdminBlogCategories.mockReturnValue({ ...DEFAULT_RETURN, data: [] });
    renderWithProviders(<BlogAdminCategories />);
    expect(screen.getAllByText("Add category").length).toBeGreaterThan(0);
  });

  it("hides Add category button when canManage is false", () => {
    const { useCan } = jest.requireMock("@/hooks/api/access") as { useCan: jest.Mock };
    useCan.mockReturnValueOnce(false);
    useAdminBlogCategories.mockReturnValue({ ...DEFAULT_RETURN, data: [] });
    renderWithProviders(<BlogAdminCategories />);
    expect(screen.queryByText("Add category")).not.toBeInTheDocument();
  });

  it("has no axe violations with category data", async () => {
    useAdminBlogCategories.mockReturnValue({ ...DEFAULT_RETURN, data: CATEGORIES });
    const { container } = renderWithProviders(<BlogAdminCategories />);
    await expectNoAxeViolations(container);
  });

  it("has no axe violations on empty state", async () => {
    useAdminBlogCategories.mockReturnValue({ ...DEFAULT_RETURN, data: [] });
    const { container } = renderWithProviders(<BlogAdminCategories />);
    await expectNoAxeViolations(container);
  });

  it("renders at mobile viewport (375px)", () => {
    const restore = atViewport("mobile");
    useAdminBlogCategories.mockReturnValue({ ...DEFAULT_RETURN, data: CATEGORIES });
    renderWithProviders(<BlogAdminCategories />);
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    restore();
  });
});
