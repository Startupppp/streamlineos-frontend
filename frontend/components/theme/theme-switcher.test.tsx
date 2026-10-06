import { act, fireEvent, render, screen } from "@testing-library/react";
import { AppThemeProvider } from "./app-theme-provider";
import { ThemeMenuPanel } from "./theme-switcher";
import { APP_THEME_MODE_STORAGE_KEY } from "@/lib/theme/app-themes";

describe("ThemeMenuPanel", () => {
  beforeEach(() => {
    document.documentElement.className = "dark";
    window.localStorage.clear();
    window.localStorage.setItem(APP_THEME_MODE_STORAGE_KEY, "dark");
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
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

  it("applies light mode from pointer down before the menu can unmount", () => {
    render(
      <AppThemeProvider>
        <ThemeMenuPanel />
      </AppThemeProvider>,
    );

    const light = screen.getByRole("button", { name: /light/i });
    act(() => {
      fireEvent.pointerDown(light);
    });

    expect(window.localStorage.getItem(APP_THEME_MODE_STORAGE_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
