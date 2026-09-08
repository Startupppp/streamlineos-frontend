import { isHandheldDevicePath } from "./sidebar-nav-items";

/**
 * T28 — the RF surface is a scanner screen, not a page.
 *
 * Found by running `/inventory/rf` on a 375px viewport: the shell floats the
 * onboarding checklist over the header, and at that width it covers the task
 * number and the back control. Measured, "Getting Started" occupied y 52-272
 * while the RF heading sat at y 68-88 — a real overlap, not a rounding artifact.
 *
 * The predicate is tested rather than the render because that is what the shell
 * branches on, and because a route added under `/inventory/rf` later must be
 * covered without anybody remembering this.
 */
describe("isHandheldDevicePath", () => {
  it("covers the RF queue and every runner beneath it", () => {
    expect(isHandheldDevicePath("/inventory/rf")).toBe(true);
    expect(isHandheldDevicePath("/inventory/rf/putaway")).toBe(true);
    expect(isHandheldDevicePath("/inventory/rf/putaway/64")).toBe(true);
    expect(isHandheldDevicePath("/inventory/rf/pick/12")).toBe(true);
  });

  it("does not catch the desktop inventory pages the operator's supervisor uses", () => {
    expect(isHandheldDevicePath("/inventory")).toBe(false);
    expect(isHandheldDevicePath("/inventory/stock")).toBe(false);
    // The prefix guard is on a path segment, so a route that merely starts with
    // the same letters is not swept in.
    expect(isHandheldDevicePath("/inventory/rfid")).toBe(false);
    expect(isHandheldDevicePath("/inventory/rf-report")).toBe(false);
  });
});
