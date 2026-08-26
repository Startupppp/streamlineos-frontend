import { RECORD_LAYOUTS, layoutByKey } from "./registry";
import { validateLayout } from "./layout";
import { applyAdjustment, hidableFields } from "./layout-adjustment";
import { formFields, schemaForLayout } from "./layout-schema";
import { proposeFromFill } from "./layout-proposal";

/**
 * Every description in the product, held to the engine's rules.
 *
 * This is the test that replaces testing the generated screens. A screen made
 * from a valid description is correct by construction — that is the point of
 * having one engine — so what is worth asserting is that the descriptions are
 * valid, that they stay valid after a tenant rearranges them, and that they stay
 * valid when the system proposes a rearrangement of its own. A new record type
 * is then one entry here and no new test file.
 */
describe("every registered record layout", () => {
  it.each(RECORD_LAYOUTS.map((layout) => [layout.key, layout] as const))(
    "%s refers to nothing it does not define",
    (_key, layout) => {
      expect(validateLayout(layout)).toEqual([]);
    },
  );

  it.each(RECORD_LAYOUTS.map((layout) => [layout.key, layout] as const))(
    "%s is still valid after a tenant hides everything they are allowed to",
    (_key, layout) => {
      const adjusted = applyAdjustment(layout, {
        layoutKey: layout.key,
        hidden: hidableFields(layout),
      });
      expect(validateLayout(adjusted)).toEqual([]);
      // Hiding is display. The record keeps every field it ever had.
      expect(adjusted.fields).toEqual(layout.fields);
    },
  );

  it.each(RECORD_LAYOUTS.map((layout) => [layout.key, layout] as const))(
    "%s is still valid after a tenant reverses the field order",
    (_key, layout) => {
      const reversed = [...layout.fields].map((field) => field.name).reverse();
      const adjusted = applyAdjustment(layout, { layoutKey: layout.key, order: reversed });
      expect(validateLayout(adjusted)).toEqual([]);
      expect(adjusted.list.columns.filter((column) => column.primary)).toHaveLength(1);
    },
  );

  it.each(RECORD_LAYOUTS.map((layout) => [layout.key, layout] as const))(
    "%s produces a form schema for both modes",
    (_key, layout) => {
      expect(() => schemaForLayout(layout, "create")).not.toThrow();
      expect(() => schemaForLayout(layout, "edit")).not.toThrow();
      // A read-only field is never a control; it would submit a value the API drops.
      for (const field of formFields(layout, "create")) expect(field.readOnly).toBeFalsy();
    },
  );

  it.each(RECORD_LAYOUTS.map((layout) => [layout.key, layout] as const))(
    "%s accepts an arrangement proposed from its own records",
    (_key, layout) => {
      // Every field filled in every record: the proposal then hides nothing and
      // only reorders, which is the case that has to stay valid for a tenant who
      // accepts one on a record type nobody has left blank.
      const filled = Object.fromEntries(layout.fields.map((field) => [field.name, 25]));
      const proposal = proposeFromFill(layout, 25, filled);
      expect(proposal).not.toBeNull();
      if (proposal) expect(validateLayout(applyAdjustment(layout, proposal.adjustment))).toEqual([]);
    },
  );

  it("addresses each record type by a key nothing else uses", () => {
    const keys = RECORD_LAYOUTS.map((layout) => layout.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(layoutByKey(key)?.key).toBe(key);
  });

  it("gives every record type a name a screen can put on a button", () => {
    for (const layout of RECORD_LAYOUTS) {
      expect(layout.singular.trim()).not.toBe("");
      expect(layout.plural.trim()).not.toBe("");
      expect(layout.list.searchPlaceholder.trim()).not.toBe("");
    }
  });
});
