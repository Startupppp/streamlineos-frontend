import { Wrapper, GOLD, BLUE, GOLD_LIGHT, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyKnowledgeIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="98" cy="102" r="78" fill={BLUE} opacity="0.03" />

      <path d="M96 78Q68 68 44 76v56q24-8 52 2z" fill="white" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M96 78q28-10 52-2v56q-24-8-52 2z" fill="white" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" />
      <line x1="96" y1="78" x2="96" y2="134" stroke={BLUE} strokeWidth="1.5" opacity="0.2" />

      <line x1="54" y1="88" x2="86" y2="82" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      <line x1="54" y1="100" x2="82" y2="94" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.15" />
      <line x1="54" y1="112" x2="78" y2="107" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.1" />

      <line x1="106" y1="82" x2="138" y2="88" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      <line x1="106" y1="94" x2="134" y2="100" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.15" />

      <path d="M130 80v18l5-4 5 5V82z" fill={GOLD} opacity="0.35" />

      <circle cx="97" cy="48" r="10" fill={GOLD} opacity="0.12" stroke={GOLD} strokeWidth="1.5" />
      <path d="M94 52h6M95 55h4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
      <g opacity="0.4">
        <line x1="97" y1="30" x2="97" y2="34" stroke={GOLD_LIGHT} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="82" y1="38" x2="85" y2="41" stroke={GOLD_LIGHT} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="112" y1="38" x2="109" y2="41" stroke={GOLD_LIGHT} strokeWidth="1.5" strokeLinecap="round" />
      </g>

      <circle cx="170" cy="86" r="12" fill={SKIN} />
      <ellipse cx="170" cy="77" rx="10" ry="9" fill={HAIR} />
      <rect x="160" y="96" width="20" height="26" rx="5" fill={GOLD} />
      <path d="M160 104l-12 8" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <rect x="162" y="122" width="6" height="20" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="172" y="122" width="6" height="20" rx="3" fill={BLUE} opacity="0.7" />

      <circle cx="34" cy="130" r="3" fill={GOLD} opacity="0.15" />
      <circle cx="26" cy="112" r="2" fill={BLUE} opacity="0.1" />
      <g opacity="0.2">
        <path d="M36 52l5 5M41 52l-5 5" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
      </g>

      <ellipse cx="100" cy="158" rx="80" ry="5" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}
