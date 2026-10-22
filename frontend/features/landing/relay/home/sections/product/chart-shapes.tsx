import { useId } from "react";


type Tone = "dim" | "accent";

const useSvgId = () => useId().replace(/[^A-Za-z0-9_-]/g, "");

type Face = "left" | "right" | "top";

export const ChartCube = ({ h, tone }: { h: number; tone: Tone }) => {
  const id = useSvgId();
  const grad = (face: Face) => `${id}-${face}`;
  const stops = (face: Face) => (
    <>
      <stop style={{ stopColor: `var(--product-cube-${tone}-${face}-from)` }} />
      <stop
        offset="1"
        style={{ stopColor: `var(--product-cube-${tone}-${face}-to)` }}
      />
    </>
  );
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 76 ${h}`}
      preserveAspectRatio="none"
      fill="none"
      className="block size-full max-w-none"
    >
      <path d={`M0 48L38 68V${h}L0 ${h - 20}V48Z`} fill={`url(#${grad("left")})`} />
      <path d={`M38 68L76 48V${h - 20}L38 ${h}V68Z`} fill={`url(#${grad("right")})`} />
      <path d="M38 28L76 48L38 68L0 48L38 28Z" fill={`url(#${grad("top")})`} />
      <defs>
        <linearGradient id={grad("left")} x1="19" y1="48" x2="19" y2={h} gradientUnits="userSpaceOnUse">
          {stops("left")}
        </linearGradient>
        <linearGradient id={grad("right")} x1="57" y1="48" x2="57" y2={h} gradientUnits="userSpaceOnUse">
          {stops("right")}
        </linearGradient>
        <linearGradient id={grad("top")} x1="38" y1="28" x2="38" y2="68" gradientUnits="userSpaceOnUse">
          {stops("top")}
        </linearGradient>
      </defs>
    </svg>
  );
};

export const ChartCap = ({ tone, className }: { tone: Tone; className: string }) => (
  <svg aria-hidden="true" viewBox="0 0 60 32" fill="none" className={className}>
    <path
      d="M30 0L60 16L30 32L0 16L30 0Z"
      style={{ fill: `var(--product-cap-${tone})` }}
    />
  </svg>
);

export const ChartCapGlow = ({ className }: { className: string }) => {
  const id = `glow${useSvgId()}`;
  return (
    <svg aria-hidden="true" viewBox="0 0 100 72" fill="none" className={className}>
      <g filter={`url(#${id})`}>
        <path
          d="M50 20L80 36L50 52L20 36L50 20Z"
          style={{ fill: "var(--product-cap-accent)" }}
        />
      </g>
      <defs>
        <filter
          id={id}
          x="0"
          y="0"
          width="100"
          height="72"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
    </svg>
  );
};
