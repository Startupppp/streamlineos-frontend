import { act, render } from "@testing-library/react";
import { AppThemeProvider, useAppTheme } from "./app-theme-provider";
import {
  APP_THEME_MODE_STORAGE_KEY,
} from "@/lib/theme/app-themes";

function ModeProbe() {
  const { setMode, isDark } = useAppTheme();
  return (
    <button type="button" onClick={() => setMode(isDark ? "light" : "dark")}>
      toggle
    </button>
  );
}

describe("AppThemeProvider mode classes", () => {
  beforeEach(() => {
    document.documentElement.className = "light";
    window.localStorage.clear();
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

  it("keeps light and dark mutually exclusive on the documentElement", () => {
    const { getByRole } = render(
      <AppThemeProvider>
        <ModeProbe />
      </AppThemeProvider>,
    );

    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    act(() => {
      getByRole("button", { name: "toggle" }).click();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(window.localStorage.getItem(APP_THEME_MODE_STORAGE_KEY)).toBe("dark");

    act(() => {
      getByRole("button", { name: "toggle" }).click();
    });

    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
