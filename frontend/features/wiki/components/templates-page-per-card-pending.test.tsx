import { render, screen, fireEvent, act } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import TemplatesPage from "./templates-page";
import { STARTER_TEMPLATES } from "@/features/wiki/lib/starter-templates";
import { getPlainText, normalizePlateValue } from "@/components/editor/plate/plate-value-convert";
import { pageHref } from "@/lib/knowledge-routes";

const createMutate = jest.fn();
const updateMutate = jest.fn();
const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("@/hooks/api/kb", () => ({
  useCreateKbPage: () => ({ mutate: createMutate, isPending: false }),
  useUpdateKbPage: () => ({ mutate: updateMutate, isPending: false }),
  useKbPageTemplates: () => ({
    data: [
      { id: 11, name: "Meeting notes", description: null, icon: null },
      { id: 22, name: "Runbook", description: null, icon: null },
    ],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
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

const { toast } = jest.requireMock("sonner") as { toast: { error: jest.Mock } };
function useButtons() {
  return screen.getAllByRole("button", { name: /^Use$/ });
}

describe("using one wiki template must not put every other template into a pending state", () => {
  beforeEach(() => {
    createMutate.mockReset();
    updateMutate.mockReset();
    mockPush.mockReset();
    toast.error.mockReset();
  });

  it("shows pending on the clicked card only, and never on its siblings", () => {
    render(
      <TooltipProvider>
        <TemplatesPage />
      </TooltipProvider>,
    );

    const buttons = useButtons();
    expect(buttons.length).toBeGreaterThan(1);

    const clicked = buttons[0];
    fireEvent.click(clicked);

    expect(createMutate).toHaveBeenCalledTimes(1);

    const after = useButtons();
    const busy = after.filter((button) => button.getAttribute("aria-busy") === "true");

    expect(busy).toHaveLength(1);
    expect(busy[0]).toBe(after[0]);
    expect(after[0].querySelector(".animate-spin")).not.toBeNull();
    expect(after[1].querySelector(".animate-spin")).toBeNull();
  });

  it("stores starter sections as Plate nodes that the new page can render", () => {
    render(
      <TooltipProvider>
        <TemplatesPage />
      </TooltipProvider>,
    );

    fireEvent.click(useButtons()[0]);
    act(() => createMutate.mock.calls[0][1].onSuccess({ id: 42, contentRevision: 3 }));

    expect(createMutate.mock.calls[0][0]).toEqual({ title: STARTER_TEMPLATES[0].name });
    expect(updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        pageId: 42,
        content: STARTER_TEMPLATES[0].content.children,
        expectedContentRevision: 3,
      }),
      expect.any(Object),
    );
    const savedContent = updateMutate.mock.calls[0][0].content;
    expect(getPlainText(normalizePlateValue(savedContent))).toContain("Meeting Notes");
  });
  it("keeps a failed content update visible and retries it without creating another page", () => {
    render(
      <TooltipProvider>
        <TemplatesPage />
      </TooltipProvider>,
    );

    fireEvent.click(useButtons()[0]);
    act(() => createMutate.mock.calls[0][1].onSuccess({ id: 42, contentRevision: 3 }));
    act(() => updateMutate.mock.calls[0][1].onError(new Error("network interrupted")));

    expect(mockPush).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Page created, but template content was not saved",
      expect.objectContaining({ action: expect.objectContaining({ label: "Retry content" }) }),
    );

    act(() => toast.error.mock.calls[0][1].action.onClick());

    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(updateMutate).toHaveBeenCalledTimes(2);
    expect(updateMutate.mock.calls[1][0]).toEqual(updateMutate.mock.calls[0][0]);

    act(() => updateMutate.mock.calls[1][1].onSuccess());
    expect(mockPush).toHaveBeenCalledWith(pageHref(42));
  });
  it("fires the mutation for the template that was actually clicked", () => {
    render(
      <TooltipProvider>
        <TemplatesPage />
      </TooltipProvider>,
    );

    const buttons = useButtons();
    fireEvent.click(buttons[buttons.length - 1]);

    expect(createMutate).toHaveBeenCalledTimes(1);
  });
});
