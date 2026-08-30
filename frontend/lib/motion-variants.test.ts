import { renderHook } from "@testing-library/react";

jest.mock("framer-motion", () => ({
  useReducedMotion: jest.fn(() => false),
}));

import { useReducedMotion } from "framer-motion";
import { useMotionVariants } from "./motion-variants";

describe("useMotionVariants — reduced-motion contract", () => {
  afterEach(() => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
  });

  it("returns full variants when reduced motion is not preferred", () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    const { result } = renderHook(() => useMotionVariants());
    expect(result.current.fadeUp.hidden).toEqual(
      expect.objectContaining({ y: 16 }),
    );
    expect(result.current.slideInLeft.hidden).toEqual(
      expect.objectContaining({ x: -12 }),
    );
    expect(result.current.scaleIn.hidden).toEqual(
      expect.objectContaining({ scale: 0.95 }),
    );
  });

  it("returns opacity-only hidden states when reduced motion is preferred", () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    const { result } = renderHook(() => useMotionVariants());

    for (const name of ["fadeUp", "fadeIn", "slideInLeft", "scaleIn"] as const) {
      const hidden = result.current[name].hidden as Record<string, unknown>;
      expect(hidden).not.toHaveProperty("y");
      expect(hidden).not.toHaveProperty("x");
      expect(hidden).not.toHaveProperty("scale");
      expect(hidden).toHaveProperty("opacity", 0);
    }
  });

  it("staggerContainer drops stagger delay when reduced motion is preferred", () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    const { result } = renderHook(() => useMotionVariants());
    const visible = result.current.staggerContainer.visible as {
      transition?: { staggerChildren?: number };
    };
    expect(visible.transition?.staggerChildren).toBe(0);
  });

  it("staggerContainer retains stagger delay when reduced motion is not preferred", () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    const { result } = renderHook(() => useMotionVariants());
    const visible = result.current.staggerContainer.visible as {
      transition?: { staggerChildren?: number };
    };
    expect((visible.transition?.staggerChildren ?? 0) > 0).toBe(true);
  });
});
