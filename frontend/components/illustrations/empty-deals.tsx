import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyDealsIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />

      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;0,-4;0,0"
          dur="3.8s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          keyTimes="0;0.5;1"
        />
        <rect x="76" y="50" width="48" height="24" rx="6" fill="white" stroke={GOLD} strokeWidth="2" />
        <path d="M88 62 L94 68 L112 52" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <circle cx="100" cy="104" r="14" fill={GOLD} opacity="0.1" stroke={GOLD} strokeWidth="1.5" strokeDasharray="4 3">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 100 104"
          to="360 100 104"
          dur="10s"
          repeatCount="indefinite"
        />
      </circle>
      <path d="M82 104 L94 104" stroke={SKIN} strokeWidth="7" strokeLinecap="round">
        <animate attributeName="opacity" values="1;0.55;1" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M118 104 L106 104" stroke={SKIN} strokeWidth="7" strokeLinecap="round">
        <animate attributeName="opacity" values="1;0.55;1" dur="2s" begin="0.15s" repeatCount="indefinite" />
      </path>

      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;0,-3;0,0"
          dur="3s"
          begin="0.2s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          keyTimes="0;0.5;1"
        />
        <circle cx="36" cy="82" r="13" fill={SKIN} />
        <ellipse cx="36" cy="73" rx="11" ry="10" fill={HAIR} />
        <rect x="24" y="93" width="24" height="28" rx="6" fill={GOLD} />
        <path d="M48 100 L66 102" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
        <rect x="26" y="121" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
        <rect x="35" y="121" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      </g>

      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;0,-3;0,0"
          dur="3s"
          begin="0.8s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          keyTimes="0;0.5;1"
        />
        <circle cx="164" cy="82" r="13" fill={SKIN} />
        <ellipse cx="164" cy="73" rx="11" ry="10" fill={HAIR} />
        <rect x="152" y="93" width="24" height="28" rx="6" fill={BLUE} opacity="0.75" />
        <path d="M152 100 L134 102" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
        <rect x="154" y="121" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
        <rect x="163" y="121" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      </g>

      <circle cx="100" cy="32" r="3" fill={GOLD}>
        <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" begin="0.5s" repeatCount="indefinite" />
      </circle>
      <path d="M40 48l2-4 2 4-2 4z" fill={GOLD}>
        <animate attributeName="opacity" values="0.15;0.45;0.15" dur="2.5s" repeatCount="indefinite" />
      </path>
      <path d="M160 46l2-4 2 4-2 4z" fill={BLUE}>
        <animate attributeName="opacity" values="0.12;0.38;0.12" dur="2.5s" begin="0.7s" repeatCount="indefinite" />
      </path>

      <ellipse cx="100" cy="158" rx="80" ry="5" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}
