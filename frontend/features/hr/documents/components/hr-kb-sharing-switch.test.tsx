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

function admin(stored: { link: boolean; search?: boolean; ai?: boolean }, hrModuleEnabled = true) {
  const full = { link: stored.link, search: stored.search ?? false, ai: stored.ai ?? false };
  return { data: { stored: full, effective: hrModuleEnabled ? full : { link: false, search: false, ai: false }, hrModuleEnabled } };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCan.mockImplementation((key) => key === "kb:settings:manage");
  mockAdmin.mockReturnValue(admin({ link: false }));
  mockUpdate.mockResolvedValue({});
});

const link = () => screen.getByRole("switch", { name: "Share company documents in the Knowledge Base" });
const search = () => screen.getByRole("switch", { name: "Let people search company documents" });
const assistants = () => screen.getByRole("switch", { name: "Let the AI assistants use company documents" });

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

  it("says it is off, and turns sharing on only after the person confirms what that does", async () => {
    render(<HrKbSharingSwitch />);

    expect(screen.getByText(/nothing about HR documents shows in the Knowledge Base/i)).toBeInTheDocument();
    fireEvent.click(link());
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(await screen.findByText(/personal documents such as payslips and contracts can never be shared/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ link: true }));
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("turns sharing off after confirmation, and says search and the assistants go with it and nothing is deleted", async () => {
    mockAdmin.mockReturnValue(admin({ link: true, search: true, ai: true }));
    render(<HrKbSharingSwitch />);

    fireEvent.click(link());
    expect(await screen.findByText(/search and the assistants stop using company documents too/i)).toBeInTheDocument();
    expect(screen.getByText(/stay as they are and come back if you turn this on again/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ link: false }));
  });

  it("locks search until sharing is on, and the assistants until search is on, and says what to turn on first", () => {
    render(<HrKbSharingSwitch />);

    expect(search()).toBeDisabled();
    expect(assistants()).toBeDisabled();
    expect(screen.getByText(/turn on sharing first/i)).toBeInTheDocument();
    expect(screen.getByText(/turn on search first/i)).toBeInTheDocument();
  });

  it("unlocks search once sharing is on, and keeps the assistants locked until search is", () => {
    mockAdmin.mockReturnValue(admin({ link: true }));
    render(<HrKbSharingSwitch />);

    expect(search()).toBeEnabled();
    expect(assistants()).toBeDisabled();
  });

  it("turns search on with a confirmation that says people only find what they could already open and no file is searched", async () => {
    mockAdmin.mockReturnValue(admin({ link: true }));
    render(<HrKbSharingSwitch />);

    fireEvent.click(search());
    expect(await screen.findByText(/only ever find documents they could already open, and the contents of the files are not searched/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ search: true }));
  });

  it("turns the assistants on with a confirmation that says only the details are used, never the file", async () => {
    mockAdmin.mockReturnValue(admin({ link: true, search: true }));
    render(<HrKbSharingSwitch />);

    fireEvent.click(assistants());
    expect(await screen.findByText(/contents of the files are never read or sent/i)).toBeInTheDocument();
    expect(screen.getByText(/only for a person who could open that document/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ ai: true }));
  });

  it("turns only the assistants off when asked to, and leaves search alone", async () => {
    mockAdmin.mockReturnValue(admin({ link: true, search: true, ai: true }));
    render(<HrKbSharingSwitch />);

    fireEvent.click(assistants());
    fireEvent.click(await screen.findByRole("button", { name: "Turn off" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ ai: false }));
    expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ search: false }));
  });

  it("makes no change when the person cancels", async () => {
    render(<HrKbSharingSwitch />);

    fireEvent.click(link());
    fireEvent.click(await screen.findByRole("button", { name: /cancel/i }));

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("warns that the HR module has to be enabled when it is not", () => {
    mockAdmin.mockReturnValue(admin({ link: true }, false));

    render(<HrKbSharingSwitch />);

    expect(screen.getByText("The HR module has to be enabled for this to work.")).toBeInTheDocument();
  });

  it("shows the message and a copyable reference when the change is refused", async () => {
    mockUpdate.mockRejectedValue(new ApiError("You cannot change this setting.", 403, "FORBIDDEN", { correlationId: "req-a9" }, "/kb/settings/hr-link-flags"));
    render(<HrKbSharingSwitch />);

    fireEvent.click(link());
    fireEvent.click(await screen.findByRole("button", { name: "Turn on" }));

    expect(await screen.findByText("Not changed")).toBeInTheDocument();
    expect(screen.getByText("req-a9")).toBeInTheDocument();
    expect(mockToast.error).toHaveBeenCalled();
  });
});
