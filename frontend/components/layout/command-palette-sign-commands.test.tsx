import { renderHook } from "@testing-library/react";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useCommandRegistry } from "./command-palette-commands";

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: undefined })),
  useCan: jest.fn(),
  useModuleEnabled: jest.fn(),
}));
jest.mock("./command-palette-hrms-commands", () => ({ useHrmsCommands: () => [] }));
jest.mock("@/components/theme/app-theme-provider", () => ({ useAppTheme: () => ({ setMode: jest.fn() }) }));

const mockedCan = useCan as jest.Mock;
const mockedModuleEnabled = useModuleEnabled as jest.Mock;

function signCommands(keys: string[], signEnabled: boolean, onSelect = jest.fn()) {
  mockedCan.mockImplementation((key: string) => keys.includes(key));
  mockedModuleEnabled.mockImplementation((key: string) => key === "sign" && signEnabled);
  const { result } = renderHook(() =>
    useCommandRegistry({ projectId: null, handleSelect: onSelect, handleCreateTicket: jest.fn(), onOpenAskOs: jest.fn() }),
  );
  return result.current.filter((command) => command.id.startsWith("sign-") && command.isAvailable);
}

describe("Sign OS actions in the command palette", () => {
  it("offers New envelope and Open envelopes to someone who can send envelopes", () => {
    const onSelect = jest.fn();
    const commands = signCommands(["sign:envelope:create", "sign:envelope:view"], true, onSelect);

    expect(commands.map((command) => command.label)).toEqual(["New envelope", "Open envelopes"]);
    commands[0].execute();
    expect(onSelect).toHaveBeenCalledWith("/sign/envelopes?create=1");
  });

  it("offers nothing when the organisation has Sign OS turned off", () => {
    expect(signCommands(["sign:envelope:create", "sign:envelope:view"], false)).toEqual([]);
  });

  it("does not offer New envelope to someone who can only view", () => {
    expect(signCommands(["sign:envelope:view"], true).map((command) => command.label)).toEqual(["Open envelopes"]);
  });
});
