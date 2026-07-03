import { Wrapper, GOLD, BLUE, GOLD_LIGHT, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyReportIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="98" cy="100" r="78" fill={BLUE} opacity="0.03" />

      <rect x="44" y="48" width="110" height="88" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      <line x1="44" y1="64" x2="154" y2="64" stroke={BLUE} strokeWidth="1.5" opacity="0.15" />
      <circle cx="53" cy="56" r="2" fill={GOLD} opacity="0.4" />
      <circle cx="61" cy="56" r="2" fill={BLUE} opacity="0.15" />

      <rect x="58" y="104" width="12" height="22" rx="2" fill={BLUE} opacity="0.12" />
      <rect x="78" y="90" width="12" height="36" rx="2" fill={GOLD} opacity="0.2" />
      <rect x="98" y="112" width="12" height="14" rx="2" fill={BLUE} opacity="0.08" />
      <rect x="118" y="98" width="12" height="28" rx="2" fill={BLUE} opacity="0.15" />

      <path d="M58 92l22-14 20 8 24-16" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5" />
      <circle cx="124" cy="70" r="2.5" fill={GOLD_LIGHT} opacity="0.7" />

      <circle cx="146" cy="126" r="14" fill="white" stroke={BLUE} strokeWidth="2.5" />
      <circle cx="146" cy="126" r="9" fill={BLUE} opacity="0.04" />
      <line x1="156" y1="136" x2="168" y2="148" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />

      <circle cx="176" cy="70" r="12" fill={SKIN} />
      <ellipse cx="176" cy="61" rx="10" ry="9" fill={HAIR} />
      <rect x="166" y="80" width="20" height="26" rx="5" fill={BLUE} />
      <path d="M166 88l-10 8" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />

      <circle cx="32" cy="120" r="3" fill={GOLD} opacity="0.15" />
      <circle cx="26" cy="102" r="2" fill={BLUE} opacity="0.1" />
      <g opacity="0.2">
        <path d="M34 40l5 5M39 40l-5 5" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
      </g>

      <ellipse cx="100" cy="158" rx="80" ry="5" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}
