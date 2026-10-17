import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import { DEFAULT_ORG_COUNTRY, DEFAULT_ORG_TIMEZONE } from "@/lib/location/org-locale-options";

/**
 * BUG-HRMS-009. Organization create asked for a name and an optional billing
 * email, so country stayed null and the time zone stayed `Asia/Kolkata` from the
 * column default for every organization — including one created in another
 * country, whose every leave date and payroll cut-off then read from IST.
 *
 * The defaults are India-first and must keep working: an operator who changes
 * nothing has to get exactly what they got before the field existed.
 */

const createMutateAsync = jest.fn();
const switchMutate = jest.fn();

jest.mock("@/hooks/api/organization", () => ({
  useCreateOrganization: () => ({ mutateAsync: createMutateAsync, isPending: false }),
}));

jest.mock("@/hooks/common/auth-hooks", () => ({
  useSwitchOrg: () => ({ mutate: switchMutate, isPending: false }),
}));

jest.mock("@/lib/api-client", () => ({ clearBackendTokenCache: jest.fn() }));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (next: string) => void;
    children: React.ReactNode;
  }) => (
    <select value={value} onChange={(event) => onValueChange(event.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

beforeEach(() => {
  createMutateAsync.mockReset();
  createMutateAsync.mockResolvedValue({ id: "org-1" });
  switchMutate.mockReset();
});

function selects(): HTMLElement[] {
  return screen.getAllByRole("combobox");
}

async function submitWithName(name: string) {
  await userEvent.type(screen.getByPlaceholderText("Acme Corp"), name);
  await userEvent.click(screen.getByRole("button", { name: "Create" }));
}

describe("creating an organization states its country and time zone", () => {
  it("sends the India-first defaults when the operator changes nothing", async () => {
    render(<CreateWorkspaceDialog open onOpenChange={jest.fn()} />);

    await submitWithName("Alpha Technologies");

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled());
    expect(createMutateAsync.mock.calls[0][0]).toMatchObject({
      name: "Alpha Technologies",
      country: DEFAULT_ORG_COUNTRY,
      timezone: DEFAULT_ORG_TIMEZONE,
    });
  });

  it("sends the country the operator picked, with a zone that country uses", async () => {
    render(<CreateWorkspaceDialog open onOpenChange={jest.fn()} />);

    await userEvent.selectOptions(selects()[0], "JP");
    await submitWithName("Alpha KK");

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled());
    expect(createMutateAsync.mock.calls[0][0]).toMatchObject({
      country: "JP",
      timezone: "Asia/Tokyo",
    });
  });

  it("never leaves a zone the chosen country does not use", async () => {
    render(<CreateWorkspaceDialog open onOpenChange={jest.fn()} />);

    await userEvent.selectOptions(selects()[0], "JP");
    await userEvent.selectOptions(selects()[0], "IN");

    const zones = within(selects()[1])
      .getAllByRole("option")
      .map((option) => option.getAttribute("value"));
    expect(zones).toEqual([DEFAULT_ORG_TIMEZONE]);
  });
});
