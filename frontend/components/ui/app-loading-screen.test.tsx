import { render, screen } from "@testing-library/react";

jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage({
    alt,
    src,
    width,
    height,
    className,
    priority: _priority,
  }: {
    alt: string;
    src: string;
    width?: number;
    height?: number;
    className?: string;
    priority?: boolean;
  }) {
    return <img alt={alt} src={src} width={width} height={height} className={className} />;
  },
}));

jest.mock("framer-motion", () => {
  const React = jest.requireActual<typeof import("react")>("react");

  function MotionDiv({
    children,
    animate: _animate,
    initial: _initial,
    transition: _transition,
    ...rest
  }: React.PropsWithChildren<Record<string, unknown>>) {
    return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
  }

  function MotionSpan({
    children,
    animate: _animate,
    initial: _initial,
    transition: _transition,
    ...rest
  }: React.PropsWithChildren<Record<string, unknown>>) {
    return <span {...(rest as React.HTMLAttributes<HTMLSpanElement>)}>{children}</span>;
  }

  function MotionSvg({
    children,
    animate: _animate,
    initial: _initial,
    transition: _transition,
    viewBox,
    ...rest
  }: React.PropsWithChildren<Record<string, unknown>>) {
    return (
      <svg viewBox={viewBox as string} {...(rest as React.SVGAttributes<SVGSVGElement>)}>
        {children}
      </svg>
    );
  }

  function MotionP({
    children,
    animate: _animate,
    initial: _initial,
    transition: _transition,
    ...rest
  }: React.PropsWithChildren<Record<string, unknown>>) {
    return <p {...(rest as React.HTMLAttributes<HTMLParagraphElement>)}>{children}</p>;
  }

  return {
    motion: {
      div: MotionDiv,
      span: MotionSpan,
      svg: MotionSvg,
      p: MotionP,
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => children,
    useReducedMotion: jest.fn(() => false),
  };
});

import type React from "react";
import { useReducedMotion } from "framer-motion";
import { AppLoadingScreen } from "./app-loading-screen";

describe("AppLoadingScreen — ARIA attributes", () => {
  it("carries role=status so the loading screen is announced by screen readers", () => {
    render(<AppLoadingScreen />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("carries aria-live=polite for non-intrusive announcements", () => {
    render(<AppLoadingScreen />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("carries aria-busy=true so AT knows content is still loading", () => {
    render(<AppLoadingScreen />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("renders the label text for additional context", () => {
    render(<AppLoadingScreen label="Preparing workspace" />);
    expect(screen.getByText("Preparing workspace")).toBeInTheDocument();
  });
});

describe("AppLoadingScreen — reduced-motion preference", () => {
  afterEach(() => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
  });

  it("suppresses the rotation and scale animations: renders the simplified path when motion is reduced", () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    render(<AppLoadingScreen />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading")).toBeInTheDocument();
  });

  it("renders the full decorative path when motion is not reduced", () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    render(<AppLoadingScreen />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByAltText("StreamlineOS")).toBeInTheDocument();
  });

  it("keeps ARIA attributes on both paths so screen readers always announce the state", () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    const { rerender } = render(<AppLoadingScreen />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");

    (useReducedMotion as jest.Mock).mockReturnValue(false);
    rerender(<AppLoadingScreen />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });
});
