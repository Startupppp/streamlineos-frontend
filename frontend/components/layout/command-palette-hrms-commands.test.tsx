import { renderHook } from "@testing-library/react";
import { useCan } from "@/hooks/api/access";
import { useHrmsCommands } from "./command-palette-hrms-commands";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));

const mockedCan = useCan as jest.Mock;

function grant(keys: string[]) {
  mockedCan.mockImplementation((key: string) => keys.includes(key));
}

function availableLabels(keys: string[], onSelect = jest.fn()) {
  grant(keys);
  const { result } = renderHook(() => useHrmsCommands(onSelect));
  return result.current.filter((command) => command.isAvailable).map((c) => c.label);
}

describe("HRMS-UX-017 — HRMS palette actions are permission-filtered", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("offers nothing to an actor with no HRMS permission", () => {
    expect(availableLabels([])).toEqual([]);
  });

  it("offers an employee only their own self-service actions", () => {
    expect(availableLabels(["self:leaves", "self:attendance"])).toEqual([
      "Request leave or WFH",
      "Clock in",
    ]);
  });

  it("offers the Action Center to a leave approver who holds no workflow key", () => {
    expect(availableLabels(["hr:leaves:approve"])).toEqual([
      "Open Action Center",
    ]);
  });

  it("offers Add employee and Payroll readiness only on their own keys", () => {
    expect(
      availableLabels(["hr:employees:create", "payroll:runs:view"]),
    ).toEqual(["Add employee", "Open Payroll readiness"]);
  });

  it("routes each action at a declared destination", () => {
    const onSelect = jest.fn();
    grant(["self:leaves"]);
    const { result } = renderHook(() => useHrmsCommands(onSelect));

    result.current.find((c) => c.id === "hrms-request-leave")?.execute();

    expect(onSelect).toHaveBeenCalledWith("/me/time-off");
  });

  it("declares every action in the shared registry group", () => {
    grant([]);
    const { result } = renderHook(() => useHrmsCommands(jest.fn()));

    expect(result.current.map((command) => command.group)).toEqual(
      result.current.map(() => "actions"),
    );
  });
});
