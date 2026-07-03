import { Wrapper, GOLD, BLUE, GOLD_LIGHT, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyCompaniesIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />
      <line x1="28" y1="145" x2="172" y2="145" stroke={BLUE} strokeWidth="2" opacity="0.12" />

      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;0,-2;0,0"
          dur="5s"
          begin="0.4s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          keyTimes="0;0.5;1"
        />
        <rect x="42" y="100" width="34" height="45" rx="2" fill={BLUE} opacity="0.05" stroke={BLUE} strokeWidth="2" />
        <rect x="48" y="108" width="7" height="7" rx="1" fill={GOLD}>
          <animate attributeName="opacity" values="0.35;0.75;0.35" dur="3s" begin="0s" repeatCount="indefinite" />
        </rect>
        <rect x="63" y="108" width="7" height="7" rx="1" fill={BLUE}>
          <animate attributeName="opacity" values="0.15;0.45;0.15" dur="3s" begin="1.5s" repeatCount="indefinite" />
        </rect>
        <rect x="48" y="121" width="7" height="7" rx="1" fill={BLUE}>
          <animate attributeName="opacity" values="0.12;0.38;0.12" dur="3s" begin="0.8s" repeatCount="indefinite" />
        </rect>
        <rect x="63" y="121" width="7" height="7" rx="1" fill={GOLD}>
          <animate attributeName="opacity" values="0.2;0.55;0.2" dur="3s" begin="2s" repeatCount="indefinite" />
        </rect>
        <rect x="48" y="134" width="7" height="7" rx="1" fill={BLUE} opacity="0.08" />
        <rect x="63" y="134" width="7" height="7" rx="1" fill={BLUE} opacity="0.08" />
      </g>

      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;0,-3;0,0"
          dur="4.5s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          keyTimes="0;0.5;1"
        />
        <rect x="82" y="60" width="36" height="85" rx="2" fill={BLUE} opacity="0.06" stroke={BLUE} strokeWidth="2" />
        <line x1="100" y1="60" x2="100" y2="48" stroke={BLUE} strokeWidth="2" opacity="0.18" />
        <circle cx="100" cy="46" r="3" fill={GOLD}>
          <animate attributeName="opacity" values="0.45;1;0.45" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="r" values="3;4;3" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <rect x="88" y="70" width="9" height="9" rx="1" fill={GOLD}>
          <animate attributeName="opacity" values="0.3;0.65;0.3" dur="3s" begin="0.3s" repeatCount="indefinite" />
        </rect>
        <rect x="103" y="70" width="9" height="9" rx="1" fill={GOLD}>
          <animate attributeName="opacity" values="0.2;0.55;0.2" dur="3s" begin="1.2s" repeatCount="indefinite" />
        </rect>
        <rect x="88" y="85" width="9" height="9" rx="1" fill={BLUE}>
          <animate attributeName="opacity" values="0.14;0.4;0.14" dur="3s" begin="0.6s" repeatCount="indefinite" />
        </rect>
        <rect x="103" y="85" width="9" height="9" rx="1" fill={BLUE}>
          <animate attributeName="opacity" values="0.1;0.35;0.1" dur="3s" begin="2.1s" repeatCount="indefinite" />
        </rect>
        <rect x="88" y="100" width="9" height="9" rx="1" fill={BLUE} opacity="0.12" />
        <rect x="103" y="100" width="9" height="9" rx="1" fill={GOLD} opacity="0.18" />
        <rect x="88" y="115" width="9" height="9" rx="1" fill={BLUE} opacity="0.08" />
        <rect x="103" y="115" width="9" height="9" rx="1" fill={BLUE} opacity="0.08" />
        <rect x="93" y="127" width="14" height="18" rx="2" fill={BLUE} opacity="0.08" stroke={BLUE} strokeWidth="1" />
      </g>

      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;0,-2;0,0"
          dur="5s"
          begin="1s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          keyTimes="0;0.5;1"
        />
        <rect x="124" y="82" width="34" height="63" rx="2" fill={BLUE} opacity="0.05" stroke={BLUE} strokeWidth="2" />
        <rect x="130" y="90" width="7" height="7" rx="1" fill={BLUE}>
          <animate attributeName="opacity" values="0.14;0.45;0.14" dur="3s" begin="1.8s" repeatCount="indefinite" />
        </rect>
        <rect x="145" y="90" width="7" height="7" rx="1" fill={GOLD}>
          <animate attributeName="opacity" values="0.25;0.6;0.25" dur="3s" begin="0.9s" repeatCount="indefinite" />
        </rect>
        <rect x="130" y="103" width="7" height="7" rx="1" fill={GOLD} opacity="0.18" />
        <rect x="145" y="103" width="7" height="7" rx="1" fill={BLUE} opacity="0.1" />
        <rect x="130" y="116" width="7" height="7" rx="1" fill={BLUE} opacity="0.08" />
        <rect x="145" y="116" width="7" height="7" rx="1" fill={BLUE} opacity="0.07" />
      </g>

      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;0,-2;0,0"
          dur="3.5s"
          begin="0.3s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          keyTimes="0;0.5;1"
        />
        <circle cx="26" cy="128" r="9" fill={SKIN} />
        <ellipse cx="26" cy="121" rx="8" ry="7" fill={HAIR} />
        <rect x="17" y="136" width="18" height="18" rx="5" fill={GOLD} />
        <rect x="19" y="154" width="5" height="12" rx="3" fill={BLUE} opacity="0.7" />
        <rect x="27" y="154" width="5" height="12" rx="3" fill={BLUE} opacity="0.7" />
      </g>

      <circle cx="172" cy="68" r="3" fill={GOLD}>
        <animate attributeName="opacity" values="0.2;0.55;0.2" dur="2.8s" begin="0.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="165" cy="55" r="2" fill={GOLD_LIGHT}>
        <animate attributeName="opacity" values="0.25;0.65;0.25" dur="2s" begin="0.2s" repeatCount="indefinite" />
      </circle>
      <path d="M32 44l4 4M36 44l-4 4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round">
        <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" begin="1.4s" repeatCount="indefinite" />
      </path>

      <ellipse cx="100" cy="158" rx="80" ry="5" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}
