import { fireEvent, render, screen } from "@testing-library/react";
import { EnableModuleButton } from "./enable-module-button";

const mockCan = jest.fn<boolean, [string]>();
const mockMutate = jest.fn();
const mockReplace = jest.fn();
const mockRefresh = jest.fn();

jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key) }));
jest.mock("@/hooks/api/access/org-modules", () => ({
  useToggleOrgModule: () => ({ mutate: mockMutate, isPending: false }),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

function succeed() {
  const [, options] = mockMutate.mock.calls[0];
  options.onSuccess();
}

describe("EnableModuleButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("offers nothing to someone who cannot manage modules", () => {
    mockCan.mockReturnValue(false);
    render(<EnableModuleButton moduleKey="payroll" moduleName="Payroll" />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(mockCan).toHaveBeenCalledWith("settings:manage");
  });

  it("turns the module on and returns to the page that was refused", () => {
    mockCan.mockReturnValue(true);
    window.history.replaceState(null, "", "/access-denied?required=module:payroll&from=%2Fpayroll%2Freadiness");
    render(<EnableModuleButton moduleKey="payroll" moduleName="Payroll" />);

    fireEvent.click(screen.getByRole("button", { name: "Enable Payroll" }));
    expect(mockMutate).toHaveBeenCalledWith({ moduleKey: "payroll", enabled: true }, expect.any(Object));
    succeed();

    expect(mockReplace).toHaveBeenCalledWith("/payroll/readiness");
    expect(screen.getByText(/switching it off keeps its data/i)).toBeInTheDocument();
    expect(screen.getByText(/does not change your bill/i)).toBeInTheDocument();
  });

  it("refreshes in place rather than following an off-site return path", () => {
    mockCan.mockReturnValue(true);
    window.history.replaceState(null, "", "/access-denied?from=%2F%2Fevil.example");
    render(<EnableModuleButton moduleKey="payroll" moduleName="Payroll" />);

    fireEvent.click(screen.getByRole("button", { name: "Enable Payroll" }));
    succeed();

    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalled();
  });
});
