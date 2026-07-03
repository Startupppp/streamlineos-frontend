import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyOrdersIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="98" cy="100" r="78" fill={BLUE} opacity="0.03" />

      <rect x="56" y="42" width="72" height="102" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="78" y="34" width="28" height="14" rx="4" fill={GOLD} opacity="0.15" stroke={GOLD} strokeWidth="1.5" />

      <rect x="66" y="62" width="9" height="9" rx="2" stroke={GOLD} strokeWidth="1.5" fill={GOLD} opacity="0.12" />
      <path d="M68 66.5l2.5 2.5 4.5-5" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="82" y1="66" x2="118" y2="66" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.2" />

      <rect x="66" y="82" width="9" height="9" rx="2" stroke={BLUE} strokeWidth="1.5" fill="none" opacity="0.3" />
      <line x1="82" y1="86" x2="112" y2="86" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.15" />

      <rect x="66" y="102" width="9" height="9" rx="2" stroke={BLUE} strokeWidth="1.5" fill="none" opacity="0.25" />
      <line x1="82" y1="106" x2="106" y2="106" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.12" />

      <line x1="66" y1="126" x2="96" y2="126" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.08" />

      <g transform="translate(134, 122)">
        <path d="M0 0h5l4 16h18l4-12H11" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
        <circle cx="12" cy="22" r="2.5" fill={GOLD} opacity="0.6" />
        <circle cx="24" cy="22" r="2.5" fill={GOLD} opacity="0.6" />
      </g>

      <circle cx="163" cy="70" r="13" fill={SKIN} />
      <ellipse cx="163" cy="60" rx="11" ry="10" fill={HAIR} />
      <rect x="151" y="82" width="24" height="28" rx="6" fill={BLUE} />
      <path d="M151 92l-16 8" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />

      <circle cx="38" cy="130" r="3" fill={GOLD} opacity="0.15" />
      <circle cx="30" cy="112" r="2" fill={BLUE} opacity="0.1" />
      <g opacity="0.2">
        <path d="M40 50l5 5M45 50l-5 5" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
      </g>

      <ellipse cx="100" cy="158" rx="80" ry="5" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}
