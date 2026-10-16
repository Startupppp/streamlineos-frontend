import { render, screen } from "@testing-library/react";
import { DealLinkedProjectCard } from "./deal-linked-project-card";

const mockCan = jest.fn<boolean, [string]>();
const mockLinked = jest.fn();

jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key) }));
jest.mock("@/hooks/api/build/projects", () => ({
  useProject: (id: number) => ({ data: id ? { id, key: "ACME", name: "Rollout" } : undefined }),
}));
jest.mock("@/hooks/api/crm/deal-project-link", () => ({
  useDealLinkedProject: () => mockLinked(),
  useLinkDealProject: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/components/ui/project-combobox", () => ({
  ProjectCombobox: () => <div data-testid="project-picker" />,
}));

const allowed = { denied: false };

describe("DealLinkedProjectCard", () => {
  beforeEach(() => {
    mockCan.mockReset();
    mockLinked.mockReset();
  });

  it("names the linked project and offers no second link", () => {
    mockCan.mockReturnValue(true);
    mockLinked.mockReturnValue({ data: { dealId: 1, projectId: 9 }, isLoading: false, access: allowed });
    render(<DealLinkedProjectCard dealId={1} />);
    expect(screen.getByRole("link", { name: /ACME · Rollout/ })).toHaveAttribute("href", "/build/9");
    expect(screen.queryByTestId("project-picker")).not.toBeInTheDocument();
  });

  it("offers the picker to someone who may update deals and see projects", () => {
    mockCan.mockReturnValue(true);
    mockLinked.mockReturnValue({ data: null, isLoading: false, access: allowed });
    render(<DealLinkedProjectCard dealId={1} />);
    expect(screen.getByTestId("project-picker")).toBeInTheDocument();
  });

  it("renders nothing when unlinked and the user may not link", () => {
    mockCan.mockReturnValue(false);
    mockLinked.mockReturnValue({ data: null, isLoading: false, access: allowed });
    const { container } = render(<DealLinkedProjectCard dealId={1} />);
    expect(container).toBeEmptyDOMElement();
  });
});
