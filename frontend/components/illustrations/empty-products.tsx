import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyProductsIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="98" cy="100" r="78" fill={BLUE} opacity="0.03" />

      <rect x="50" y="90" width="78" height="54" rx="4" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="50" y="90" width="78" height="12" fill={BLUE} opacity="0.05" />

      <path d="M50 90L36 72l38 6z" fill={BLUE} opacity="0.06" stroke={BLUE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M128 90l14-18-38 6z" fill={BLUE} opacity="0.06" stroke={BLUE} strokeWidth="1.5" strokeLinejoin="round" />

      <line x1="89" y1="90" x2="89" y2="144" stroke={BLUE} strokeWidth="1.5" opacity="0.15" />

      <circle cx="89" cy="66" r="14" stroke={BLUE} strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.2" />
      <text x="89" y="71" textAnchor="middle" fill={BLUE} fontSize="14" fontWeight="bold" opacity="0.15">?</text>

      <g transform="translate(118, 128) rotate(-18)">
        <rect x="-11" y="-7" width="22" height="14" rx="2" fill={GOLD} opacity="0.15" stroke={GOLD} strokeWidth="1.5" />
        <circle cx="-6" cy="0" r="1.6" fill="white" stroke={GOLD} strokeWidth="1.2" />
      </g>
      <path d="M112 124q-8-4-12-12" stroke={GOLD} strokeWidth="1.2" fill="none" opacity="0.4" />

      <circle cx="163" cy="80" r="13" fill={SKIN} />
      <ellipse cx="163" cy="70" rx="11" ry="10" fill={HAIR} />
      <rect x="151" y="92" width="24" height="30" rx="6" fill={GOLD} />
      <path d="M151 102l-16 10" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <rect x="153" y="122" width="7" height="23" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="164" y="122" width="7" height="23" rx="3" fill={BLUE} opacity="0.7" />

      <circle cx="36" cy="128" r="3" fill={GOLD} opacity="0.15" />
      <circle cx="28" cy="110" r="2" fill={BLUE} opacity="0.1" />
      <g opacity="0.2">
        <path d="M42 48l5 5M47 48l-5 5" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M152 40l4 4M156 40l-4 4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
      </g>

      <ellipse cx="100" cy="158" rx="80" ry="5" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}
