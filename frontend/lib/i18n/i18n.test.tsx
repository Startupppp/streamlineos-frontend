import { render, screen } from "@testing-library/react";
import { useMyPreferences } from "@/hooks/api/me-preferences";
import { PayNotSetUpNotice } from "@/features/payroll/me/pay-not-set-up-notice";
import { I18nProvider, translate } from "./i18n";
import { en } from "./messages/en";
import { hi } from "./messages/hi";
import { te } from "./messages/te";

jest.mock("@/hooks/api/me-preferences", () => ({
  useMyPreferences: jest.fn(),
}));

const mockedPreferences = useMyPreferences as jest.Mock;

describe("ESS message catalogs", () => {
  const enKeys = Object.keys(en).sort();

  it.each([
    ["hi", hi],
    ["te", te],
  ])("%s carries exactly the English key set with no blank message", (_code, catalog) => {
    expect(Object.keys(catalog).sort()).toEqual(enKeys);
    for (const value of Object.values(catalog)) expect(value.trim()).not.toBe("");
  });

  it("keeps every interpolation placeholder in each translation", () => {
    for (const [key, template] of Object.entries(en)) {
      const placeholders = template.match(/\{\w+\}/g) ?? [];
      for (const catalog of [hi, te]) {
        const translated = new Map(Object.entries(catalog)).get(key);
        for (const placeholder of placeholders) expect(translated).toContain(placeholder);
      }
    }
  });
});

describe("translate", () => {
  it("interpolates named variables and leaves unknown ones visible", () => {
    expect(translate("en", "home.clockedInSince", { time: "9:05 AM" })).toBe(
      "Clocked in since 9:05 AM",
    );
    expect(translate("hi", "home.clockedInSince", { time: "9:05 AM" })).toBe(
      "9:05 AM से क्लॉक इन हैं",
    );
    expect(translate("en", "home.clockedInSince")).toBe("Clocked in since {time}");
  });

  it("falls back to English when a translation is blank", () => {
    const original = te["pay.title"];
    te["pay.title"] = "";
    try {
      expect(translate("te", "pay.title")).toBe("Pay");
    } finally {
      te["pay.title"] = original;
    }
  });
});

describe("I18nProvider", () => {
  afterEach(() => {
    jest.clearAllMocks();
    document.documentElement.lang = "en";
  });

  it("renders an ESS surface in Hindi when the saved preference is hi", () => {
    mockedPreferences.mockReturnValue({ data: { language: "hi" } });

    render(
      <I18nProvider>
        <PayNotSetUpNotice />
      </I18nProvider>,
    );

    expect(screen.getByText("आपका वेतन अभी सेट नहीं हुआ है")).toBeInTheDocument();
    expect(screen.queryByText("Pay isn't set up for you yet")).not.toBeInTheDocument();
    expect(document.documentElement.lang).toBe("hi");
  });

  it("renders English while the preference has not loaded", () => {
    mockedPreferences.mockReturnValue({ data: undefined });

    render(
      <I18nProvider>
        <PayNotSetUpNotice />
      </I18nProvider>,
    );

    expect(screen.getByText("Pay isn't set up for you yet")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
  });
});
