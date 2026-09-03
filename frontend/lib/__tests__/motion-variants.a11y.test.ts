import { renderHook } from "@testing-library/react";
import { setReducedMotion } from "@/test-utils/viewport";
import { useMotionVariants, fadeUp, scaleIn, staggerContainer } from "@/lib/motion-variants";

jest.mock("framer-motion", () => ({
  useReducedMotion: jest.fn(),
}));

const { useReducedMotion } = jest.requireMock("framer-motion") as {
  useReducedMotion: jest.MockedFunction<() => boolean>;
};

describe("useMotionVariants — respects prefers-reduced-motion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns full motion variants when reduced motion is not preferred", () => {
    useReducedMotion.mockReturnValue(false);
    const { result } = renderHook(() => useMotionVariants());
    expect(result.current.fadeUp).toBe(fadeUp);
    expect(result.current.scaleIn).toBe(scaleIn);
    expect(result.current.staggerContainer).toBe(staggerContainer);
  });

  it("returns opacity-only variants when reduced motion IS preferred", () => {
    useReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => useMotionVariants());
    const { fadeUp: rFadeUp, scaleIn: rScaleIn } = result.current;
    expect(rFadeUp).not.toBe(fadeUp);
    expect(rScaleIn).not.toBe(scaleIn);
  });

  it("reduced fadeUp variant does NOT include translate (y) to avoid motion for vestibular disorders", () => {
    useReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => useMotionVariants());
    const hidden = result.current.fadeUp.hidden as Record<string, unknown>;
    expect(hidden).not.toHaveProperty("y");
  });

  it("reduced scaleIn variant does NOT include scale", () => {
    useReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => useMotionVariants());
    const hidden = result.current.scaleIn.hidden as Record<string, unknown>;
    expect(hidden).not.toHaveProperty("scale");
  });

  it("reduced variants still animate opacity so content is not permanently invisible", () => {
    useReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => useMotionVariants());
    const { fadeUp: rFadeUp } = result.current;
    const hidden = rFadeUp.hidden as Record<string, unknown>;
    const visible = rFadeUp.visible as Record<string, unknown>;
    expect(hidden["opacity"]).toBe(0);
    expect(visible["opacity"]).toBe(1);
  });

  it("reduced staggerContainer has zero stagger so children animate simultaneously", () => {
    useReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => useMotionVariants());
    const stagger = result.current.staggerContainer;
    const visible = stagger.visible as { transition?: { staggerChildren?: number } };
    expect(visible.transition?.staggerChildren).toBe(0);
  });
});

describe("useMotionVariants — BITE PROOF", () => {
  it("fails if the reduced variant still contains translate", () => {
    useReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => useMotionVariants());
    const hidden = result.current.slideInLeft.hidden as Record<string, unknown>;
    expect(hidden).not.toHaveProperty("x");
  });
});
