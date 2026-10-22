import { CONTACT_CONSENT_LAYOUT } from "./contact-consent-layout";

function field(name: string) {
  const found = CONTACT_CONSENT_LAYOUT.fields.find((f) => f.name === name);
  if (!found) throw new Error(`no field named ${name}`);
  return found;
}

const formFields = CONTACT_CONSENT_LAYOUT.form?.sections.flatMap((s) => s.fields) ?? [];

describe("how the consent description handles provenance", () => {
  it("declares every source the system can store, so a system row is not an unknown value", () => {
    const values = (field("source").options ?? []).map((o) => o.value);

    expect(values).toEqual(
      expect.arrayContaining(["USER_ENTRY", "IMPORT", "API", "ENRICHMENT"]),
    );
    expect(values).toEqual(expect.arrayContaining(["UNSUBSCRIBE_LINK", "WEB_FORM"]));
  });

  it("never offers source in the form, so the UI cannot forge it", () => {
    expect(field("source").readOnly).toBe(true);
    expect(formFields).not.toContain("source");
  });

  it("does not editorialise a lawful basis", () => {
    const bases = field("legalBasis").options ?? [];
    expect(bases.length).toBe(4);
    expect(bases.every((o) => o.tone === "neutral")).toBe(true);

    const channels = field("channel").options ?? [];
    expect(channels.every((o) => o.tone === "neutral")).toBe(true);
  });

  it("marks an unestablished basis as a question rather than a resting state", () => {
    const status = Object.fromEntries(
      (field("status").options ?? []).map((o) => [o.value, o.tone]),
    );

    expect(status.OPTED_IN).toBe("success");
    expect(status.OPTED_OUT).toBe("danger");
    expect(status.UNKNOWN).toBe("warning");
  });

  it("asks for the two things an operator can actually answer", () => {
    expect(field("capturedAt").readOnly).toBe(true);
    expect(formFields).not.toContain("capturedAt");
    expect(formFields).toEqual(expect.arrayContaining(["channel", "status"]));
  });
});
