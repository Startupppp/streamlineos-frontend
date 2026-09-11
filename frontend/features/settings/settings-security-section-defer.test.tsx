"use client";

import { act, render, screen } from "@testing-library/react";

let mockVariant: "mobile" | "desktop" = "desktop";
let mockLoaded = false;

jest.mock("@/hooks/common/use-after-load", () => ({
  useAfterLoad: () => mockLoaded,
}));

jest.mock("@/components/layout/shell-variant-context", () => ({
  useShellVariant: () => mockVariant,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

const mfaMounted = { count: 0 };
const securityMounted = { count: 0 };

jest.mock("@/features/settings/settings-security", () => ({
  SettingsSecurity: () => {
    securityMounted.count++;
    return <div data-testid="security" />;
  },
}));

jest.mock("@/components/settings/mfa-settings", () => ({
  MfaSettings: () => {
    mfaMounted.count++;
    return <div data-testid="mfa" />;
  },
}));

jest.mock("next/dynamic", () =>
  (importFn: () => Promise<{ default: React.ComponentType }>) => {
    let Comp: React.ComponentType | null = null;
    importFn().then((m) => {
      Comp = m.default;
    });
    function DynamicComponent() {
      if (!Comp) return null;
      return <Comp />;
    }
    return DynamicComponent;
  },
);

import { SettingsSecuritySection } from "./settings-security-section";

describe("SettingsSecuritySection deferred MFA on mobile", () => {
  beforeEach(() => {
    mfaMounted.count = 0;
    securityMounted.count = 0;
    mockLoaded = false;
  });
  afterEach(() => {
    mockVariant = "desktop";
  });

  it("renders MFA placeholder skeleton immediately on mobile (not mounted yet)", async () => {
    mockVariant = "mobile";
    await act(async () => {
      render(<SettingsSecuritySection />);
    });
    expect(screen.queryByTestId("mfa")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("mounts MFA on mobile once the page has loaded", async () => {
    mockVariant = "mobile";
    const view = await act(async () => render(<SettingsSecuritySection />));
    expect(screen.queryByTestId("mfa")).not.toBeInTheDocument();
    mockLoaded = true;
    await act(async () => {
      view.rerender(<SettingsSecuritySection />);
    });
    expect(screen.queryByTestId("mfa")).toBeInTheDocument();
  });

  it("mounts MFA immediately on desktop", async () => {
    mockVariant = "desktop";
    await act(async () => {
      render(<SettingsSecuritySection />);
    });
    expect(screen.queryByTestId("mfa")).toBeInTheDocument();
  });
});
