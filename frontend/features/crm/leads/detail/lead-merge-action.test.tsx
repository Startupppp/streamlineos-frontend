import { fireEvent, render, screen } from "@testing-library/react";
import { LeadMergeAction } from "./lead-merge-action";

const mockCan = jest.fn<boolean, [string]>();
const mockMutate = jest.fn();
const mockDuplicates = jest.fn();

jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key) }));
jest.mock("@/hooks/api/crm/leads", () => ({
  useDuplicateLeads: (options: { enabled?: boolean }) => mockDuplicates(options),
  useMergeLead: () => ({ mutate: mockMutate, isPending: false }),
}));

const groups = {
  groups: [
    {
      leads: [
        { id: 7, name: "Asha", email: "asha@x.test" },
        { id: 9, name: "Asha K", email: "asha@x.test" },
      ],
      matchReason: ["email"],
      score: 90,
    },
    { leads: [{ id: 1, name: "Other" }, { id: 2, name: "Other 2" }], matchReason: [], score: 50 },
  ],
  total: 2,
};

describe("LeadMergeAction", () => {
  beforeEach(() => {
    mockCan.mockReset();
    mockMutate.mockReset();
    mockDuplicates.mockReturnValue({ data: groups, isLoading: false, isError: false });
  });

  it("reads duplicates only once opened, and merges the picked duplicate into this lead", () => {
    mockCan.mockReturnValue(true);
    render(<LeadMergeAction leadId={7} leadName="Asha" />);
    expect(mockDuplicates).toHaveBeenLastCalledWith({ enabled: false });

    fireEvent.click(screen.getByRole("button", { name: /merge duplicate/i }));
    expect(mockDuplicates).toHaveBeenLastCalledWith({ enabled: true });
    expect(screen.queryByText("Other")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^merge$/i }));
    expect(mockMutate).toHaveBeenCalledWith({ keepLeadId: 7, mergeLeadId: 9 }, expect.anything());
  });

  it("is absent without the merge permission", () => {
    mockCan.mockReturnValue(false);
    render(<LeadMergeAction leadId={7} leadName="Asha" />);
    expect(mockCan).toHaveBeenCalledWith("crm:leads:assign");
    expect(screen.queryByRole("button", { name: /merge duplicate/i })).not.toBeInTheDocument();
  });
});
