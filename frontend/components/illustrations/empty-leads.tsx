import { Wrapper, GOLD, BLUE, GOLD_LIGHT, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyLeadsIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />

      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;0,-5;0,0"
          dur="4s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          keyTimes="0;0.5;1"
        />
        <path d="M46 36 L154 36 L122 82 L78 82 Z" fill={BLUE} opacity="0.05" stroke={BLUE} strokeWidth="2" />
        <rect x="84" y="82" width="32" height="50" rx="4" fill={BLUE} opacity="0.05" stroke={BLUE} strokeWidth="2" />
        <ellipse cx="100" cy="135" rx="4" ry="6" fill={GOLD} opacity="0.3" />
        <circle cx="70" cy="52" r="4.5" fill={GOLD}>
          <animate attributeName="opacity" values="0.4;0.85;0.4" dur="2s" begin="0s" repeatCount="indefinite" />
        </circle>
        <circle cx="100" cy="44" r="4.5" fill={GOLD}>
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" begin="0.4s" repeatCount="indefinite" />
        </circle>
        <circle cx="130" cy="52" r="4.5" fill={GOLD}>
          <animate attributeName="opacity" values="0.35;0.85;0.35" dur="2s" begin="0.8s" repeatCount="indefinite" />
        </circle>
      </g>

      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;0,-3;0,0"
          dur="3.5s"
          begin="0.6s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          keyTimes="0;0.5;1"
        />
        <circle cx="36" cy="88" r="13" fill={SKIN} />
        <ellipse cx="36" cy="79" rx="11" ry="10" fill={HAIR} />
        <rect x="24" y="99" width="24" height="28" rx="6" fill={GOLD} />
        <path d="M48 105 L62 93" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
        <rect x="26" y="127" width="7" height="20" rx="3" fill={BLUE} opacity="0.7" />
        <rect x="35" y="127" width="7" height="20" rx="3" fill={BLUE} opacity="0.7" />
      </g>

      <path d="M54 100 L73 82" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3">
        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2.5s" repeatCount="indefinite" />
      </path>

      <circle cx="162" cy="65" r="3" fill={GOLD}>
        <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" begin="1s" repeatCount="indefinite" />
      </circle>
      <path d="M168 78l2-4 2 4-2 4z" fill={BLUE} opacity="0.15" />
      <circle cx="30" cy="55" r="2" fill={GOLD_LIGHT}>
        <animate attributeName="opacity" values="0.3;0.75;0.3" dur="2s" begin="0.3s" repeatCount="indefinite" />
      </circle>

      <ellipse cx="100" cy="158" rx="80" ry="5" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}
