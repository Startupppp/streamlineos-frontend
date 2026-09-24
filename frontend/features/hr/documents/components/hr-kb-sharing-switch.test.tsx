import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { HrKbSharingSwitch } from "./hr-kb-sharing-switch";

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("sonner", () => ({ toast: { success: (m: string) => mockToast.success(m), error: (m: string) => mockToast.error(m) } }));

const mockCan = jest.fn<boolean, [string]>();
jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key) }));

const mockAdmin = jest.fn();
const mockUpdate = jest.fn();
jest.mock("@/hooks/api/kb/hr-link-config", () => ({
  useHrKbLinkFlagsAdmin: () => mockAdmin(),
  useUpdateHrKbLinkFlags: () => ({ mutateAsync: mockUpdate, isPending: false }),
}));

function admin(link: boolean, hrModuleEnabled = true) {
  return { data: { stored: { link, search: false, ai: false }, effective: { link: link && hrModuleEnabled, search: false, ai: false }, hrModuleEnabled } };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCan.mockImplementation((key) => key === "kb:settings:manage");
  mockAdmin.mockReturnValue(admin(false));
  mockUpdate.mockResolvedValue({});
});

const toggle = () => screen.getByRole("switch", { name: "Share company documents in the Knowledge Base" });

describe("HrKbSharingSwitch", () => {
  it("renders nothing for someone who does not administer the Knowledge Base", () => {
    mockCan.mockReturnValue(false);

    const { container } = render(<HrKbSharingSwitch />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing until the current setting has loaded, rather than showing a guess", () => {
    mockAdmin.mockReturnValue({ data: undefined });

    const { container } = render(<HrKbSharingSwitch />);

    expect(container).toBeEmptyDOMElement();
  });

  it("says it is off, and turns it on only after the person confirms what that does", async () => {
    render(<HrKbSharingSwitch />);

    expect(screen.getByText(/nothing about HR documents shows in the Knowledge Base/i)).toBeInTheDocument();
    fireEvent.click(toggle());
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(await screen.findByText(/personal documents such as payslips and contracts can never be shared/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ link: true }));
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("turns it off after confirmation, and says nothing is deleted", async () => {
    mockAdmin.mockReturnValue(admin(true));
    render(<HrKbSharingSwitch />);

    fireEvent.click(toggle());
    expect(await screen.findByText(/stay as they are and come back if you turn this on again/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ link: false }));
  });

  it("makes no change when the person cancels", async () => {
    render(<HrKbSharingSwitch />);

    fireEvent.click(toggle());
    fireEvent.click(await screen.findByRole("button", { name: /cancel/i }));

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("warns that the HR module has to be enabled when it is not", () => {
    mockAdmin.mockReturnValue(admin(true, false));

    render(<HrKbSharingSwitch />);

    expect(screen.getByText("The HR module has to be enabled for this to work.")).toBeInTheDocument();
  });

  it("shows the message and a copyable reference when the change is refused", async () => {
    mockUpdate.mockRejectedValue(new ApiError("You cannot change this setting.", 403, "FORBIDDEN", { correlationId: "req-a9" }, "/kb/settings/hr-link-flags"));
    render(<HrKbSharingSwitch />);

    fireEvent.click(toggle());
    fireEvent.click(await screen.findByRole("button", { name: "Turn on" }));

    expect(await screen.findByText("Not changed")).toBeInTheDocument();
    expect(screen.getByText("req-a9")).toBeInTheDocument();
    expect(mockToast.error).toHaveBeenCalled();
  });
});
