import { PARTY_LAYOUT } from "@/lib/renderer/party-layout";
import { validateLayout } from "@/lib/renderer/layout";
import { applyAdjustment, validateAdjustment } from "@/lib/renderer/layout-adjustment";
import {
  adjustmentFrom,
  declaredGroups,
  draftFrom,
  moveRow,
  setGroup,
  setHidden,
} from "./arrangement-draft";

/**
 * What an administrator does, and what gets stored because of it.
 *
 * The editor's screen is thin; this is where its behaviour lives, so this is
 * where it is tested. Every assertion follows the round trip all the way to a
 * rendered layout — an arrangement that stores cleanly and then produces a
 * broken description would pass a test of the draft alone.
 */

const draft = () => draftFrom(PARTY_LAYOUT, null);
const columns = (rows: ReturnType<typeof draft>) =>
  applyAdjustment(PARTY_LAYOUT, adjustmentFrom(PARTY_LAYOUT, rows)).list.columns.map(
    (column) => column.field,
  );

describe("the arrangement an administrator is editing", () => {
  it("opens on every field the description declares, not only the visible ones", () => {
    // An editor that could not see a hidden field would give a tenant no way to
    // unhide it, which would make hiding a one-way door.
    expect(draft().map((row) => row.name)).toEqual(PARTY_LAYOUT.fields.map((f) => f.name));
  });

  it("opens on what the tenant currently has stored", () => {
    const rows = draftFrom(PARTY_LAYOUT, {
      layoutKey: PARTY_LAYOUT.key,
      order: ["email", "name"],
      hidden: ["phone"],
    });
    expect(rows[0]?.name).toBe("email");
    expect(rows.find((row) => row.name === "phone")?.hidden).toBe(true);
  });

  it("marks the title field and the required fields as not hidable", () => {
    const rows = draft();
    expect(rows.find((row) => row.name === PARTY_LAYOUT.titleField)?.hidable).toBe(false);
    for (const field of PARTY_LAYOUT.fields)
      if (field.required)
        expect(rows.find((row) => row.name === field.name)?.hidable).toBe(false);
  });

  it("moves a field and leaves the rest in their order", () => {
    const rows = draft();
    const moved = moveRow(rows, 3, -1);
    expect(moved[2]?.name).toBe(rows[3]?.name);
    expect(moved[3]?.name).toBe(rows[2]?.name);
    expect(moved.map((row) => row.name).sort()).toEqual(rows.map((row) => row.name).sort());
  });

  it("refuses to move a field off either end rather than dropping it", () => {
    const rows = draft();
    expect(moveRow(rows, 0, -1).map((row) => row.name)).toEqual(rows.map((row) => row.name));
    expect(moveRow(rows, rows.length - 1, 1).map((row) => row.name)).toEqual(
      rows.map((row) => row.name),
    );
  });

  it("hides a field the tenant may hide", () => {
    const rows = setHidden(draft(), "phone", true);
    expect(columns(rows)).not.toContain("phone");
    expect(validateAdjustment(PARTY_LAYOUT, adjustmentFrom(PARTY_LAYOUT, rows))).toEqual([]);
  });

  it("will not hide the field that titles the record, however it is asked", () => {
    const rows = setHidden(draft(), PARTY_LAYOUT.titleField, true);
    expect(rows.find((row) => row.name === PARTY_LAYOUT.titleField)?.hidden).toBe(false);
    expect(columns(rows)).toContain(PARTY_LAYOUT.titleField);
  });

  it("never removes a field from the record, only from the arrangement", () => {
    const rows = setHidden(draft(), "notes", true);
    const adjusted = applyAdjustment(PARTY_LAYOUT, adjustmentFrom(PARTY_LAYOUT, rows));
    expect(adjusted.fields.map((field) => field.name)).toContain("notes");
  });

  it("moves a field into another section", () => {
    const rows = setGroup(draft(), "phone", "Identity");
    const adjusted = applyAdjustment(PARTY_LAYOUT, adjustmentFrom(PARTY_LAYOUT, rows));
    const identity = adjusted.detail.sections.find((section) => section.title === "Identity");
    expect(identity?.fields).toContain("phone");
  });

  it("offers the sections the description already declares", () => {
    expect(declaredGroups(PARTY_LAYOUT)).toEqual(
      PARTY_LAYOUT.detail.sections.map((section) => section.title),
    );
  });

  it("produces an arrangement the engine accepts, and a layout it still considers valid", () => {
    let rows = draft();
    rows = moveRow(rows, 5, -3);
    rows = setHidden(rows, "website", true);
    rows = setGroup(rows, "taxNumber", "Contact");

    const adjustment = adjustmentFrom(PARTY_LAYOUT, rows);
    expect(validateAdjustment(PARTY_LAYOUT, adjustment)).toEqual([]);
    expect(validateLayout(applyAdjustment(PARTY_LAYOUT, adjustment))).toEqual([]);
  });

  it("round-trips: what is stored reopens as what was edited", () => {
    let rows = draft();
    rows = moveRow(rows, 4, -2);
    rows = setHidden(rows, "website", true);
    rows = setGroup(rows, "taxNumber", "Contact");

    const reopened = draftFrom(PARTY_LAYOUT, adjustmentFrom(PARTY_LAYOUT, rows));
    expect(reopened.map((row) => row.name)).toEqual(rows.map((row) => row.name));
    expect(reopened.map((row) => row.hidden)).toEqual(rows.map((row) => row.hidden));
    expect(reopened.map((row) => row.group)).toEqual(rows.map((row) => row.group));
  });
});
