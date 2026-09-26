import type { FormEvent, KeyboardEvent } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManagerCandidatePicker } from "@/components/hr/reporting-lines/manager-candidate-picker";
import { preventImplicitSubmit } from "./onboarding-enter-guard";

const ASHA = { userId: "u-asha", name: "Asha Rao", email: null, designation: "Lead", state: "active" as const };

jest.mock("@/hooks/api/hr/reporting-lines", () => ({ useManagerCandidates: () => ({ data: { items: [ASHA] } }) }));
jest.mock("@/hooks/api/hr/my-reporting-line", () => ({ useMyManagerCandidates: () => ({ data: { items: [] } }) }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => false }));
jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({ data: undefined }),
  useOrgMembersByIds: () => ({ data: undefined }),
}));
jest.mock("@/hooks/api/build/projects", () => ({ useProjectMembers: () => ({ data: [] }) }));
jest.mock("@/hooks/api/build/build-members", () => ({ useBuildMembers: () => ({ data: undefined }) }));
jest.mock("@/hooks/api/module-access", () => ({ useModuleMemberCandidates: () => ({ data: undefined }) }));

function Harness({ onSubmit, onPick, lastStep = false }: { onSubmit: () => void; onPick: (id: string | null) => void; lastStep?: boolean }) {
  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    preventImplicitSubmit(event, lastStep);
  }
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }
  return (
    <form onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
      <label htmlFor="designation">Designation</label>
      <input id="designation" />
      <ManagerCandidatePicker value={null} onChange={onPick} placeholder="Primary reporting manager" />
      <button type="submit">Next</button>
    </form>
  );
}

describe("onboarding wizard Enter handling", () => {
  it("opens a manager picker and selects an option with Enter before the last step", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const onPick = jest.fn();
    render(<Harness onSubmit={onSubmit} onPick={onPick} />);

    screen.getByRole("combobox", { name: "Primary reporting manager" }).focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("option", { name: /Asha Rao/ })).toBeInTheDocument();
    await user.keyboard("{Enter}");

    expect(onPick).toHaveBeenCalledWith("u-asha", ASHA);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("still stops Enter in a plain text field from submitting before the last step", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<Harness onSubmit={onSubmit} onPick={jest.fn()} />);
    await user.type(screen.getByLabelText("Designation"), "Engineer{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("lets Enter submit on the last step", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<Harness onSubmit={onSubmit} onPick={jest.fn()} lastStep />);
    await user.type(screen.getByLabelText("Designation"), "Engineer{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
