import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ManagerRef } from "@/hooks/api/hr/reporting-lines-schema";
import { ManagerCandidatePicker } from "./manager-candidate-picker";

const ASHA: ManagerRef = { userId: "u-asha", name: "Asha Rao", email: "asha@example.com", designation: "Engineering Manager", state: "active" };
const BEN: ManagerRef = { userId: "u-ben", name: "Ben Ortiz", email: "ben@example.com", designation: null, state: "on-notice" };
const SUBJECT: ManagerRef = { userId: "u-subject", name: "Sam Subject", email: "sam@example.com", designation: null, state: "active" };

const hrCandidates = jest.fn();
const selfCandidates = jest.fn();

jest.mock("@/hooks/api/hr/reporting-lines", () => ({
  useManagerCandidates: (...args: unknown[]) => hrCandidates(...args),
}));
jest.mock("@/hooks/api/hr/my-reporting-line", () => ({
  useMyManagerCandidates: (...args: unknown[]) => selfCandidates(...args),
}));

// The picker's own directory sources stay idle when candidates are explicit.
jest.mock("@/hooks/api/access", () => ({ useCan: () => false }));
jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({ data: undefined }),
  useOrgMembersByIds: () => ({ data: undefined }),
}));
jest.mock("@/hooks/api/build/projects", () => ({ useProjectMembers: () => ({ data: [] }) }));
jest.mock("@/hooks/api/build/build-members", () => ({ useBuildMembers: () => ({ data: undefined }) }));
jest.mock("@/hooks/api/module-access", () => ({ useModuleMemberCandidates: () => ({ data: undefined }) }));

beforeEach(() => {
  hrCandidates.mockReset().mockReturnValue({ data: { items: [ASHA, BEN, SUBJECT] } });
  selfCandidates.mockReset().mockReturnValue({ data: { items: [BEN] } });
});

describe("ManagerCandidatePicker — accessible manager selection", () => {
  it("is operable by keyboard alone and reports the chosen manager", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<ManagerCandidatePicker value={null} onChange={onChange} excludeUserId="u-subject" placeholder="Primary reporting manager" />);

    const trigger = screen.getByRole("combobox", { name: "Primary reporting manager" });
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}");

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining("Asha Rao"),
      expect.stringContaining("Ben Ortiz"),
    ]);
    // The employee is never offered as their own manager.
    expect(screen.queryByRole("option", { name: /Sam Subject/ })).not.toBeInTheDocument();
    // Designation and status are visible before choosing.
    expect(screen.getByText("Engineering Manager · Active")).toBeInTheDocument();
    expect(screen.getByText("On notice")).toBeInTheDocument();

    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("u-ben", BEN);
  });

  it("searches on the server, debounced, only while open", async () => {
    const user = userEvent.setup();
    render(<ManagerCandidatePicker value={null} onChange={jest.fn()} excludeUserId="u-subject" />);

    expect(hrCandidates).toHaveBeenLastCalledWith("", "u-subject", { enabled: false });
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Search members…"), "as");

    await waitFor(() => expect(hrCandidates).toHaveBeenLastCalledWith("as", "u-subject", { enabled: true }));
    // Server-filtered: the picker does not re-filter the capped list client-side.
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("keeps naming the selection after the search results no longer contain it", () => {
    hrCandidates.mockReturnValue({ data: { items: [] } });
    render(<ManagerCandidatePicker value="u-asha" onChange={jest.fn()} selected={ASHA} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Asha Rao");
  });

  it("uses the employee's own candidate list on self-service surfaces", async () => {
    const user = userEvent.setup();
    render(<ManagerCandidatePicker value={null} onChange={jest.fn()} source="self" />);
    await user.click(screen.getByRole("combobox"));
    expect(selfCandidates).toHaveBeenLastCalledWith("", { enabled: true });
    expect(hrCandidates).toHaveBeenLastCalledWith("", undefined, { enabled: false });
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("takes its accessible name from the field label when FormControl gives it an id", () => {
    render(
      <>
        <label htmlFor="primary-manager">Primary reporting manager</label>
        <ManagerCandidatePicker id="primary-manager" value={null} onChange={jest.fn()} placeholder="Search for a manager" aria-describedby="hint" />
        <p id="hint">Assigned automatically by policy if left blank</p>
      </>,
    );
    const trigger = screen.getByRole("combobox", { name: "Primary reporting manager" });
    expect(trigger).toHaveAccessibleDescription("Assigned automatically by policy if left blank");
  });
});
