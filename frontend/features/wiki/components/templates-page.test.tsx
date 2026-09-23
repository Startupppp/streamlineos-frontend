import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import TemplatesPage from "./templates-page";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/kb", () => ({
  useCreateKbPage: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateKbPage: () => ({ mutate: jest.fn(), isPending: false }),
  useKbPageTemplates: () => ({
    data: [{ id: 11, name: "Meeting notes", description: null, icon: null }],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useDeleteKbPageTemplate: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("TemplatesPage — Starters / Saved tabs", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  it("defaults to Starters and hides saved templates", () => {
    render(
      <TooltipProvider>
        <TemplatesPage />
      </TooltipProvider>,
    );

    expect(screen.getByRole("tab", { name: /^starters$/i })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(screen.queryByText("Meeting notes")).toBeNull();
    expect(screen.getByText("Built-in skeletons ready to use")).toBeInTheDocument();
  });

  it("shows saved templates when tab=saved", () => {
    mockSearchParams = new URLSearchParams("tab=saved");
    render(
      <TooltipProvider>
        <TemplatesPage />
      </TooltipProvider>,
    );

    expect(screen.getByRole("tab", { name: /^saved$/i })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(screen.getByText("Meeting notes")).toBeInTheDocument();
    expect(screen.getByText("Templates created from your wiki pages")).toBeInTheDocument();
  });

  it("writes tab=saved into the URL when Saved is selected", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <TemplatesPage />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole("tab", { name: /^saved$/i }));

    expect(mockReplace).toHaveBeenCalledWith(
      "/knowledge/wiki/templates?tab=saved",
      { scroll: false },
    );
  });
});
