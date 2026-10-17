import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppThemeProvider } from "./app-theme-provider";
import { ThemeMenuPanel, ThemeMenuSubmenu } from "./theme-switcher";
import { APP_THEME_MODE_STORAGE_KEY } from "@/lib/theme/app-themes";

function mockMatchMedia(matchesDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: matchesDark && query.includes("prefers-color-scheme: dark"),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

describe("Theme Light applies through real menu surfaces (E3)", () => {
  beforeEach(() => {
    document.documentElement.className = "dark";
    document.documentElement.style.colorScheme = "dark";
    window.localStorage.clear();
    window.localStorage.setItem(APP_THEME_MODE_STORAGE_KEY, "dark");
    mockMatchMedia(true);
  });

  it("applies light from ThemeMenuPanel inside an open DropdownMenu (avatar menu path)", () => {
    render(
      <AppThemeProvider>
        <DropdownMenu open onOpenChange={() => undefined}>
          <DropdownMenuTrigger asChild>
            <button type="button">Account</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <ThemeMenuPanel />
          </DropdownMenuContent>
        </DropdownMenu>
      </AppThemeProvider>,
    );

    const light = screen.getByRole("button", { name: /^light$/i });
    act(() => {
      fireEvent.pointerDown(light);
    });

    expect(window.localStorage.getItem(APP_THEME_MODE_STORAGE_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("applies light when ThemeMenuSubmenu content is forced open", () => {
    render(
      <AppThemeProvider>
        <DropdownMenu open onOpenChange={() => undefined}>
          <DropdownMenuTrigger asChild>
            <button type="button">Account</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <ThemeMenuSubmenu />
          </DropdownMenuContent>
        </DropdownMenu>
      </AppThemeProvider>,
    );

    fireEvent.pointerMove(screen.getByRole("menuitem", { name: /interface theme/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /interface theme/i }));
    const light = screen.getByRole("button", { name: /^light$/i });
    act(() => {
      fireEvent.pointerDown(light);
    });

    expect(window.localStorage.getItem(APP_THEME_MODE_STORAGE_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });
});
