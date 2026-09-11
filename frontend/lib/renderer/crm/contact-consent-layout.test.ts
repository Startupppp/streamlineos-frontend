import { CONTACT_CONSENT_LAYOUT } from "./contact-consent-layout";

function field(name: string) {
  const found = CONTACT_CONSENT_LAYOUT.fields.find((f) => f.name === name);
  if (!found) throw new Error(`no field named ${name}`);
  return found;
}

const formFields = CONTACT_CONSENT_LAYOUT.form?.sections.flatMap((s) => s.fields) ?? [];

/**
 * Provenance is the field a DPDP or GDPR audit actually leans on.
 *
 * The API accepts four sources from an authenticated operator — USER_ENTRY,
 * IMPORT, API, ENRICHMENT — and reserves UNSUBSCRIBE_LINK and WEB_FORM for the
 * system, because an operator able to claim "they unsubscribed themselves"
 * could rewrite the story of a complaint.
 *
 * That leaves a description with two bad options and one good one, and this
 * file pins the good one: declare all six so a system row renders as what it is,
 * and keep the field out of the form entirely so the UI has no control to forge
 * it with. Validating a four-value dropdown would have been the obvious answer
 * and is weaker — it puts the forging surface on screen and then argues with it.
 */
describe("how the consent description handles provenance", () => {
  it("declares every source the system can store, so a system row is not an unknown value", () => {
    const values = (field("source").options ?? []).map((o) => o.value);

    expect(values).toEqual(
      expect.arrayContaining(["USER_ENTRY", "IMPORT", "API", "ENRICHMENT"]),
    );
    /* The two an operator may never claim still have to render. */
    expect(values).toEqual(expect.arrayContaining(["UNSUBSCRIBE_LINK", "WEB_FORM"]));
  });

  it("never offers source in the form, so the UI cannot forge it", () => {
    expect(field("source").readOnly).toBe(true);
    expect(formFields).not.toContain("source");
  });

  it("does not editorialise a lawful basis", () => {
    /*
     * LEGITIMATE_INTEREST is a lawful ground, not a lesser one. Tinting it amber
     * would have the product answering a legal question it has no business
     * answering, so every basis is neutral and only `status` carries a verdict.
     */
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
    /*
     * Amber, not grey. UNKNOWN means nobody has established a basis for reaching
     * this person on this channel — the state a compliance review asks about,
     * not a neutral default.
     */
    expect(status.UNKNOWN).toBe("warning");
  });

  it("asks for the two things an operator can actually answer", () => {
    /* capturedAt is the server's, so it is shown and never asked for. */
    expect(field("capturedAt").readOnly).toBe(true);
    expect(formFields).not.toContain("capturedAt");
    expect(formFields).toEqual(expect.arrayContaining(["channel", "status"]));
  });
});
