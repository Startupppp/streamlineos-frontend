import { Wrapper, GOLD, BLUE, GOLD_LIGHT, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyClientsIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />

      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;0,-5;0,0"
          dur="3.5s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          keyTimes="0;0.5;1"
        />
        <circle cx="100" cy="54" r="22" fill={GOLD} stroke={GOLD} strokeWidth="2">
          <animate attributeName="opacity" values="0.07;0.18;0.07" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="100" cy="54" r="14" fill="white" stroke={GOLD} strokeWidth="2" />
        <path d="M92 54 L97 60 L110 48" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;0,-3;0,0"
          dur="4s"
          begin="0.5s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          keyTimes="0;0.5;1"
        />
        <circle cx="100" cy="102" r="16" fill={SKIN} />
        <ellipse cx="100" cy="92" rx="14" ry="12" fill={HAIR} />
        <rect x="86" y="117" width="28" height="32" rx="7" fill={GOLD} />
        <path d="M86 122 L68 112" stroke={SKIN} strokeWidth="6" strokeLinecap="round" />
        <path d="M114 122 L132 112" stroke={SKIN} strokeWidth="6" strokeLinecap="round" />
        <rect x="88" y="149" width="9" height="20" rx="3" fill={BLUE} opacity="0.7" />
        <rect x="103" y="149" width="9" height="20" rx="3" fill={BLUE} opacity="0.7" />
      </g>

      <path d="M52 72 L54 78 L60 78 L56 82 L58 88 L52 84 L46 88 L48 82 L44 78 L50 78 Z" fill={GOLD}>
        <animate attributeName="opacity" values="0.2;0.55;0.2" dur="2.2s" begin="0s" repeatCount="indefinite" />
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 52 80;10 52 80;0 52 80;-10 52 80;0 52 80"
          dur="4s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1"
          keyTimes="0;0.25;0.5;0.75;1"
        />
      </path>
      <path d="M148 72 L150 78 L156 78 L152 82 L154 88 L148 84 L142 88 L144 82 L140 78 L146 78 Z" fill={GOLD}>
        <animate attributeName="opacity" values="0.15;0.45;0.15" dur="2.2s" begin="0.5s" repeatCount="indefinite" />
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 148 80;-10 148 80;0 148 80;10 148 80;0 148 80"
          dur="4s"
          begin="0.5s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1"
          keyTimes="0;0.25;0.5;0.75;1"
        />
      </path>

      <circle cx="36" cy="120" r="3" fill={GOLD_LIGHT}>
        <animate attributeName="opacity" values="0.3;0.75;0.3" dur="2s" begin="0.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="164" cy="118" r="2" fill={BLUE}>
        <animate attributeName="opacity" values="0.12;0.4;0.12" dur="2.5s" begin="1s" repeatCount="indefinite" />
      </circle>
      <path d="M170 72l2-4 2 4-2 4z" fill={GOLD}>
        <animate attributeName="opacity" values="0.18;0.5;0.18" dur="3s" begin="0.7s" repeatCount="indefinite" />
      </path>

      <ellipse cx="100" cy="158" rx="80" ry="5" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}
