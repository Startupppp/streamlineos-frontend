import {
  validateEventTitle,
  validateEventDescription,
  validateEventLocation,
  buildEventPayload,
} from "./event-create-validators";
import { toDefaultForm } from "./event-form-state";

describe("validateEventTitle", () => {
  it("rejects an empty title", () => {
    expect(validateEventTitle("")).toBe("Event title is required");
  });

  it("rejects a whitespace-only title", () => {
    expect(validateEventTitle("   ")).toBe("Event title is required");
  });

  it("rejects punctuation-only title (no letters or numbers)", () => {
    expect(validateEventTitle("[[[")).toBe("Event title must contain at least one letter or number");
  });

  it("rejects symbols-only title", () => {
    expect(validateEventTitle("!!!")).toBe("Event title must contain at least one letter or number");
  });

  it("rejects a single-character title (min length 2)", () => {
    expect(validateEventTitle("A")).toBe("Event title must be at least 2 characters");
  });

  it("rejects a title over 100 characters", () => {
    expect(validateEventTitle("a".repeat(101))).toBe(
      "Event title must be at most 100 characters",
    );
  });

  it("rejects consecutive spaces", () => {
    expect(validateEventTitle("Team  meeting")).toBe(
      "Event title cannot have consecutive spaces",
    );
  });

  it("accepts a valid title", () => {
    expect(validateEventTitle("Team sync")).toBeNull();
  });

  it("accepts title starting with [ bracket (QA required case)", () => {
    expect(validateEventTitle("[QA] Module 4 audit event")).toBeNull();
  });

  it("accepts title starting with ( parenthesis", () => {
    expect(validateEventTitle("(Draft) Planning meeting")).toBeNull();
  });

  it("accepts title starting with # hash", () => {
    expect(validateEventTitle("#123 Feature implementation")).toBeNull();
  });

  it("accepts title starting with @ mention", () => {
    expect(validateEventTitle("@team standup")).toBeNull();
  });

  it("accepts title starting with quote", () => {
    expect(validateEventTitle("\"Important\" client call")).toBeNull();
  });

  it("accepts title starting with dash", () => {
    expect(validateEventTitle("- Follow up with design")).toBeNull();
  });

  it("accepts title with emoji", () => {
    expect(validateEventTitle("🎉 Launch party")).toBeNull();
  });

  it("trims leading and trailing whitespace", () => {
    expect(validateEventTitle("  Team meeting  ")).toBeNull();
  });

  it("preserves brackets and punctuation in title (no stripping)", () => {
    const title = "[WIP] Design review (draft)";
    expect(validateEventTitle(title)).toBeNull();
  });

  it("accepts minimum valid length (2 characters)", () => {
    expect(validateEventTitle("Hi")).toBeNull();
  });
});

describe("validateEventDescription", () => {
  it("accepts undefined (optional field)", () => {
    expect(validateEventDescription(undefined)).toBeNull();
  });

  it("accepts an empty string (field cleared)", () => {
    expect(validateEventDescription("")).toBeNull();
  });

  it("rejects a description under 5 characters", () => {
    expect(validateEventDescription("hi")).toBe(
      "Description must be at least 5 characters",
    );
  });

  it("rejects a description over 2000 characters", () => {
    expect(validateEventDescription("a".repeat(2001))).toBe(
      "Description must be at most 2000 characters",
    );
  });

  it("accepts a valid description", () => {
    expect(validateEventDescription("Weekly team sync agenda")).toBeNull();
  });
});

describe("validateEventLocation", () => {
  it("accepts undefined (optional field)", () => {
    expect(validateEventLocation(undefined)).toBeNull();
  });

  it("accepts a plain venue name", () => {
    expect(validateEventLocation("Conference Room B")).toBeNull();
  });

  it("rejects a malformed URL that starts with http://", () => {
    expect(validateEventLocation("https://not a valid url")).toBe(
      "Location contains an invalid URL",
    );
  });

  it("accepts a valid URL", () => {
    expect(validateEventLocation("https://meet.google.com/abc-defg-hij")).toBeNull();
  });
});

describe("buildEventPayload", () => {
  const base = toDefaultForm({
    start: new Date("2026-09-01T10:00:00"),
    end: new Date("2026-09-01T11:00:00"),
  });

  it("returns an error when startDate is missing", () => {
    const form = { ...base, startDate: "" };
    const result = buildEventPayload({
      form,
      showEndDate: false,
      linkedTicket: null,
      existingEntityId: null,
      isEdit: false,
    });
    expect(result.error).toBe("Start date is required");
  });

  it("returns an error for a duration under 15 minutes", () => {
    const form = {
      ...base,
      startDate: "2026-09-01",
      startTime: "10:00",
      endDate: "2026-09-01",
      endTime: "10:05",
    };
    const result = buildEventPayload({
      form,
      showEndDate: true,
      linkedTicket: null,
      existingEntityId: null,
      isEdit: false,
    });
    expect(result.error).toBe("Event duration must be at least 15 minutes");
  });

  it("builds a valid payload for a new event", () => {
    const result = buildEventPayload({
      form: base,
      showEndDate: false,
      linkedTicket: null,
      existingEntityId: null,
      isEdit: false,
    });
    expect(result.error).toBeNull();
    expect(typeof result.payload.startDate).toBe("string");
    expect(result.payload.title).toBe("");
  });

  it("omits syncConnectionId for an edit", () => {
    const form = { ...base, syncConnectionId: "42" };
    const result = buildEventPayload({
      form,
      showEndDate: false,
      linkedTicket: null,
      existingEntityId: null,
      isEdit: true,
    });
    expect(result.error).toBeNull();
    expect(result.payload.syncConnectionId).toBeUndefined();
  });

  it("sends an empty description when an edit clears its notes", () => {
    const result = buildEventPayload({
      form: { ...base, description: "" },
      showEndDate: false,
      linkedTicket: null,
      existingEntityId: null,
      isEdit: true,
    });
    expect(result.error).toBeNull();
    expect(result.payload.description).toBe("");
  });

  it("declares the author's browser zone when creating", () => {
    const result = buildEventPayload({
      form: base,
      showEndDate: false,
      linkedTicket: null,
      existingEntityId: null,
      isEdit: false,
    });
    expect(result.error).toBeNull();
    expect(result.payload.timezone).toBe(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  });

  it("states no timezone on an edit, so the authored zone survives the editor's", () => {
    const result = buildEventPayload({
      form: base,
      showEndDate: false,
      linkedTicket: null,
      existingEntityId: null,
      isEdit: true,
    });
    expect(result.error).toBeNull();
    expect(result.payload.timezone).toBeUndefined();
  });

  it("drops the timezone key entirely from a serialized edit body", () => {
    const result = buildEventPayload({
      form: base,
      showEndDate: false,
      linkedTicket: null,
      existingEntityId: null,
      isEdit: true,
    });
    const body: unknown = JSON.parse(JSON.stringify(result.payload));
    expect(Object.keys(body as Record<string, unknown>)).not.toContain("timezone");
  });
});

describe("CAL-B-004 / CAL-B-027 guest and reminder payload", () => {
  const base = { ...toDefaultForm({ start: new Date("2026-11-02T10:00:00"), end: new Date("2026-11-02T11:00:00") }), title: "Partner sync" };

  it("sends external guests and the chosen reminder", () => {
    const result = buildEventPayload({
      form: { ...base, guestEmails: ["qa1015cal@sharklasers.com"], reminder: "10" },
      showEndDate: false,
      linkedTicket: null,
      existingEntityId: null,
      isEdit: false,
    });
    expect(result.payload).toMatchObject({ guestEmails: ["qa1015cal@sharklasers.com"], reminderOffsetsMinutes: [10] });
  });

  it("sends an empty reminder list for No reminder and the default set when chosen", () => {
    const none = buildEventPayload({ form: { ...base, reminder: "none" }, showEndDate: false, linkedTicket: null, existingEntityId: null, isEdit: true });
    const defaults = buildEventPayload({ form: { ...base, reminder: "1440,60,15" }, showEndDate: false, linkedTicket: null, existingEntityId: null, isEdit: true });
    expect(none.payload).toMatchObject({ reminderOffsetsMinutes: [] });
    expect(defaults.payload).toMatchObject({ reminderOffsetsMinutes: [1440, 60, 15] });
  });

  it("leaves guests and reminders to the server when the user never touched them", () => {
    const result = buildEventPayload({ form: base, showEndDate: false, linkedTicket: null, existingEntityId: null, isEdit: false });
    expect(result.payload).toMatchObject({ guestEmails: undefined, reminderOffsetsMinutes: undefined });
  });
});
