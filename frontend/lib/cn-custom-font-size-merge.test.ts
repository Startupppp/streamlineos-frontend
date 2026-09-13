import { cn } from "@/lib/utils";

const CUSTOM_FONT_SIZES = ["micro", "dense", "label"] as const;

const TEXT_COLOURS = [
  "text-foreground",
  "text-muted-foreground",
  "text-primary",
  "text-destructive",
] as const;

describe("cn keeps custom font sizes alongside text colours", () => {
  it.each(CUSTOM_FONT_SIZES)(
    "text-%s survives a text colour declared after it",
    (size) => {
      for (const colour of TEXT_COLOURS) {
        const merged = cn(`text-${size} font-medium ${colour}`).split(" ");
        expect(merged).toContain(`text-${size}`);
        expect(merged).toContain(colour);
      }
    },
  );

  it.each(CUSTOM_FONT_SIZES)(
    "text-%s survives a text colour declared before it",
    (size) => {
      for (const colour of TEXT_COLOURS) {
        const merged = cn(`${colour} text-${size}`).split(" ");
        expect(merged).toContain(`text-${size}`);
        expect(merged).toContain(colour);
      }
    },
  );
});

describe("cn still collapses genuine conflicts", () => {
  it("keeps only the last of two custom font sizes", () => {
    expect(cn("text-micro text-dense")).toBe("text-dense");
    expect(cn("text-label text-micro")).toBe("text-micro");
  });

  it("keeps only the last of a custom and a built-in font size", () => {
    expect(cn("text-micro text-sm")).toBe("text-sm");
    expect(cn("text-lg text-dense")).toBe("text-dense");
  });

  it("keeps only the last of two text colours", () => {
    expect(cn("text-muted-foreground text-foreground")).toBe("text-foreground");
  });

  it("leaves built-in font sizes paired with a colour untouched", () => {
    expect(cn("text-sm text-muted-foreground").split(" ")).toEqual([
      "text-sm",
      "text-muted-foreground",
    ]);
  });
});
