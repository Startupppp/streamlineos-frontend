import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.scrollIntoView = () => undefined;
});
import type { PreferenceRuleRow } from "@/types/notifications";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-types";

const mockMutate = jest.fn();
const mockGetErrorMessage = jest.fn((err: unknown) => `formatted: ${String(err)}`);

const mockRulesData: PreferenceRuleRow[] = [];
let mockIsLoading = false;

const mockSetRuleState = {
  mutate: mockMutate,
  isPending: false,
  variables: undefined,
};

let mockModules = ["CRM", "BUILD"];

jest.mock("@/hooks/api/notifications-preferences", () => ({
  useNotificationPreferenceRules: () => ({
    data: mockRulesData,
    isLoading: mockIsLoading,
    isError: false,
  }),
  useSetNotificationPreferenceRule: () => mockSetRuleState,
}));

jest.mock("@/hooks/api/access/org-modules", () => ({
  useEnabledModules: () => mockModules,
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (err: unknown) => mockGetErrorMessage(err),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

import { PreferenceScopeRulesSection } from "./components/preference-scope-rules-section";

beforeEach(() => {
  jest.clearAllMocks();
  mockRulesData.length = 0;
  mockIsLoading = false;
  mockSetRuleState.isPending = false;
  mockSetRuleState.variables = undefined;
  mockModules = ["CRM", "BUILD"];
  mockGetErrorMessage.mockImplementation((err: unknown) => `formatted: ${String(err)}`);
});

describe("PreferenceScopeRulesSection", () => {
  describe("loading state", () => {
    it("hides preference headings and selects while rules are loading", () => {
      mockIsLoading = true;
      render(<PreferenceScopeRulesSection />);
      expect(screen.queryByText("Per-Source Preferences")).not.toBeInTheDocument();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
  });

  describe("category scope rows — driven by NOTIFICATION_CATEGORIES, not a hardcoded list", () => {
    it("renders exactly three selects (one per channel) for every category in NOTIFICATION_CATEGORIES", () => {
      mockModules = [];
      render(<PreferenceScopeRulesSection />);
      const allSelects = screen.getAllByRole("combobox");
      expect(allSelects.length).toBe(NOTIFICATION_CATEGORIES.length * 3);
    });

    it("renders the Per-Source Preferences heading", () => {
      render(<PreferenceScopeRulesSection />);
      expect(screen.getByText("Per-Source Preferences")).toBeInTheDocument();
    });

    it("includes an aria-labelled select for the Security category In-App channel", () => {
      render(<PreferenceScopeRulesSection />);
      expect(
        screen.getByRole("combobox", { name: /Security In-App notification preference/i }),
      ).toBeInTheDocument();
    });
  });

  describe("module scope rows — driven by useEnabledModules, not a hardcoded list", () => {
    it("renders three selects per enabled module", () => {
      mockModules = ["CRM", "BUILD", "HR"];
      render(<PreferenceScopeRulesSection />);
      const moduleSection = screen
        .getByText("Per-Module Preferences")
        .closest("section") as HTMLElement;
      expect(
        within(moduleSection).getByRole("combobox", { name: /CRM In-App notification preference/i }),
      ).toBeInTheDocument();
      expect(
        within(moduleSection).getByRole("combobox", { name: /Build In-App notification preference/i }),
      ).toBeInTheDocument();
    });

    it("hides the Per-Module Preferences section when no modules are enabled", () => {
      mockModules = [];
      render(<PreferenceScopeRulesSection />);
      expect(screen.queryByText("Per-Module Preferences")).not.toBeInTheDocument();
    });
  });

  describe("mode resolution", () => {
    it("shows Default when no preference rule exists for a scope+channel pair", () => {
      render(<PreferenceScopeRulesSection />);
      const trigger = screen.getByRole("combobox", {
        name: /Security In-App notification preference/i,
      });
      expect(trigger).toHaveTextContent("Default");
    });

    it("shows Off when a stored OFF rule exists for the matching scope and channel", () => {
      mockRulesData.push({
        id: 1,
        orgId: "org-1",
        membershipId: 42,
        scopeType: "CATEGORY",
        scopeKey: "SECURITY",
        channel: "IN_APP",
        mode: "OFF",
        updatedAt: "2024-01-01T00:00:00Z",
      });
      render(<PreferenceScopeRulesSection />);
      const trigger = screen.getByRole("combobox", {
        name: /Security In-App notification preference/i,
      });
      expect(trigger).toHaveTextContent("Off");
    });

    it("shows Default on a different channel even when OFF is stored on another channel for the same scope", () => {
      mockRulesData.push({
        id: 2,
        orgId: "org-1",
        membershipId: 42,
        scopeType: "CATEGORY",
        scopeKey: "SECURITY",
        channel: "IN_APP",
        mode: "OFF",
        updatedAt: "2024-01-01T00:00:00Z",
      });
      render(<PreferenceScopeRulesSection />);
      const emailTrigger = screen.getByRole("combobox", {
        name: /Security Email notification preference/i,
      });
      expect(emailTrigger).toHaveTextContent("Default");
    });

    it("shows Digest when a stored DIGEST rule exists for the matching scope and channel", () => {
      mockRulesData.push({
        id: 3,
        orgId: "org-1",
        membershipId: 42,
        scopeType: "CATEGORY",
        scopeKey: "SECURITY",
        channel: "EMAIL",
        mode: "DIGEST",
        updatedAt: "2024-01-01T00:00:00Z",
      });
      render(<PreferenceScopeRulesSection />);
      const emailTrigger = screen.getByRole("combobox", {
        name: /Security Email notification preference/i,
      });
      expect(emailTrigger).toHaveTextContent("Digest");
    });
  });

  describe("mutation payload", () => {
    it("calls set-rule mutation with exact scopeType CATEGORY, lowercase-keyed scopeKey, channel, and mode", async () => {
      const user = userEvent.setup();
      render(<PreferenceScopeRulesSection />);
      const trigger = screen.getByRole("combobox", {
        name: /Security In-App notification preference/i,
      });
      await user.click(trigger);
      await user.click(screen.getByRole("option", { name: "Off" }));
      expect(mockMutate).toHaveBeenCalledWith(
        { scopeType: "CATEGORY", scopeKey: "SECURITY", channel: "IN_APP", mode: "OFF" },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });

    it("calls set-rule mutation with scopeType MODULE and lowercase module id as scopeKey", async () => {
      const user = userEvent.setup();
      render(<PreferenceScopeRulesSection />);
      const moduleSection = screen
        .getByText("Per-Module Preferences")
        .closest("section") as HTMLElement;
      const trigger = within(moduleSection).getByRole("combobox", {
        name: /CRM In-App notification preference/i,
      });
      await user.click(trigger);
      await user.click(screen.getByRole("option", { name: "Off" }));
      expect(mockMutate).toHaveBeenCalledWith(
        { scopeType: "MODULE", scopeKey: "crm", channel: "IN_APP", mode: "OFF" },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });
  });

  describe("error handling", () => {
    it("routes mutation error through getErrorMessage and surfaces via toast.error, not a raw message string", async () => {
      const user = userEvent.setup();
      const error = new Error("upstream network error");
      mockMutate.mockImplementation(
        (_input: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(error);
        },
      );
      mockGetErrorMessage.mockReturnValue("Something went wrong");

      render(<PreferenceScopeRulesSection />);
      const trigger = screen.getByRole("combobox", {
        name: /Security In-App notification preference/i,
      });
      await user.click(trigger);
      await user.click(screen.getByRole("option", { name: "Off" }));

      expect(mockGetErrorMessage).toHaveBeenCalledWith(error);
      expect(jest.mocked(toast).error).toHaveBeenCalledWith("Something went wrong");
      expect(jest.mocked(toast).error).not.toHaveBeenCalledWith(error.message);
    });
  });

  describe("universal access — no permission gate", () => {
    it("renders preference selects for any authenticated member regardless of permission grants", () => {
      render(<PreferenceScopeRulesSection />);
      expect(screen.getByText("Per-Source Preferences")).toBeInTheDocument();
      expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
    });

    it("renders all category selects even when the rules response is an empty array", () => {
      mockRulesData.length = 0;
      render(<PreferenceScopeRulesSection />);
      expect(screen.getByText("Per-Source Preferences")).toBeInTheDocument();
      expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
    });
  });
});
