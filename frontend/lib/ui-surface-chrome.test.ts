import {
  SURFACE_CARD,
  SURFACE_CARD_INTERACTIVE,
  SURFACE_CARD_SELECTED,
  SURFACE_CLOSE_BUTTON,
  SURFACE_EMPTY,
  SURFACE_FLOATING,
  SURFACE_MODAL,
  SURFACE_OVERLAY,
  SURFACE_SHEET_MOBILE,
  SURFACE_TOAST,
} from "./ui-surface-chrome";

describe("ui-surface-chrome", () => {
  it("keeps rounded-xl cards and token borders", () => {
    expect(SURFACE_CARD).toContain("rounded-xl");
    expect(SURFACE_CARD).toContain("border-border/80");
    expect(SURFACE_CARD_INTERACTIVE).toContain("focus-visible:ring-2");
    expect(SURFACE_CARD_INTERACTIVE).toContain("motion-reduce:transition-none");
    expect(SURFACE_CARD_SELECTED).toContain("bg-foreground");
    expect(SURFACE_CARD_SELECTED).toContain("text-background");
  });

  it("keeps overlay + floating surfaces consistent", () => {
    expect(SURFACE_OVERLAY).toContain("bg-black/50");
    expect(SURFACE_MODAL).toContain("rounded-xl");
    expect(SURFACE_SHEET_MOBILE).toContain("rounded-t-2xl");
    expect(SURFACE_FLOATING).toContain("rounded-lg");
    expect(SURFACE_TOAST).toContain("rounded-lg");
    expect(SURFACE_CLOSE_BUTTON).toContain("focus-visible:ring-2");
    expect(SURFACE_EMPTY).toContain("border-dashed");
    expect(SURFACE_EMPTY).toContain("flex-1");
    expect(SURFACE_EMPTY).toContain("min-h-80");
  });
});
