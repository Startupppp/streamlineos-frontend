import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import TemplatesPage from "./templates-page";

const createMutate = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/hooks/api/kb", () => ({
  useCreateKbPage: () => ({ mutate: createMutate, isPending: false }),
  useUpdateKbPage: () => ({ mutate: jest.fn(), isPending: false }),
  useKbPageTemplates: () => ({
    data: [
      { id: 11, name: "Meeting notes", description: null, icon: null },
      { id: 22, name: "Runbook", description: null, icon: null },
    ],
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

function useButtons() {
  return screen.getAllByRole("button", { name: /^Use$/ });
}

describe("using one wiki template must not put every other template into a pending state", () => {
  beforeEach(() => createMutate.mockReset());

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
