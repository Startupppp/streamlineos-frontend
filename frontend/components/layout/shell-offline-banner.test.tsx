import { render, screen } from "@testing-library/react";
import { ShellOfflineBanner } from "./shell-offline-banner";

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(),
}));

import { useOnlineStatus } from "@/hooks/common/use-online-status";

const mockUseOnlineStatus = useOnlineStatus as jest.MockedFunction<
  typeof useOnlineStatus
>;

describe("ShellOfflineBanner", () => {
  it("renders nothing when online", () => {
    mockUseOnlineStatus.mockReturnValue(true);
    const { container } = render(<ShellOfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders an accessible banner when offline", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    render(<ShellOfflineBanner />);
    const banner = screen.getByRole("status");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute("aria-live", "polite");
    expect(banner).toHaveTextContent(/offline/i);
  });
});
