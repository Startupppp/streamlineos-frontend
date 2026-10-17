import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppThemeProvider } from "@/components/theme/app-theme-provider";
import { APP_THEME_MODE_STORAGE_KEY } from "@/lib/theme/app-themes";
import { UserAvatarMenuBody } from "./user-avatar-menu-body";

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { name: "Tarun", email: "tarun@example.com" } },
    status: "authenticated",
  }),
}));
jest.mock("@/hooks/common/auth-hooks", () => ({
  useSignOut: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/components/shared/presence-status-picker", () => ({
  PresenceStatusPicker: () => null,
}));

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <AppThemeProvider>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button type="button">Account menu</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <UserAvatarMenuBody
            name="Tarun"
            email="tarun@example.com"
            layout="dropdown"
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </AppThemeProvider>
  );
}

describe("Avatar DropdownMenu flat Light (F1)", () => {
  beforeEach(() => {
    document.documentElement.className = "dark";
    document.documentElement.style.colorScheme = "dark";
    window.localStorage.clear();
    window.localStorage.setItem(APP_THEME_MODE_STORAGE_KEY, "dark");
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query.includes("prefers-color-scheme: dark"),
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  });

  it("clicks Light in the real avatar menu tree, survives menu unmount, leaves html light", async () => {
    render(<Harness />);

    expect(
      screen.queryByRole("menuitem", { name: /interface theme/i }),
    ).not.toBeInTheDocument();

    const light = screen.getByRole("menuitem", { name: /^light$/i });
    act(() => {
      fireEvent.pointerDown(light);
      fireEvent.click(light);
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("menuitem", { name: /^light$/i }),
      ).not.toBeInTheDocument();
    });

    expect(window.localStorage.getItem(APP_THEME_MODE_STORAGE_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
});
