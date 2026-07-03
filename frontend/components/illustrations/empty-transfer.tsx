import { Wrapper, GOLD, BLUE, GOLD_LIGHT, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyTransferIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />

      <rect x="36" y="96" width="44" height="38" rx="4" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="36" y="96" width="44" height="10" fill={BLUE} opacity="0.05" />
      <line x1="58" y1="96" x2="58" y2="134" stroke={GOLD} strokeWidth="2" opacity="0.4" />

      <rect x="122" y="96" width="44" height="38" rx="4" stroke={BLUE} strokeWidth="2" strokeDasharray="4 3" fill={BLUE} fillOpacity="0.03" />
      <text x="144" y="119" textAnchor="middle" fill={BLUE} fontSize="14" fontWeight="bold" opacity="0.15">?</text>

      <path d="M84 88q17-24 34 0" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M114 82l4 6-7 1z" fill={GOLD} opacity="0.6" />

      <path d="M118 144q-17 20-34 0" stroke={GOLD_LIGHT} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.3" />
      <path d="M88 149l-4-5 7-2z" fill={GOLD_LIGHT} opacity="0.3" />

      <circle cx="101" cy="64" r="3" fill={GOLD} opacity="0.2" />

      <circle cx="176" cy="66" r="12" fill={SKIN} />
      <ellipse cx="176" cy="57" rx="10" ry="9" fill={HAIR} />
      <rect x="166" y="76" width="20" height="26" rx="5" fill={GOLD} />
      <path d="M166 84l-12 8" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />

      <circle cx="30" cy="70" r="3" fill={GOLD} opacity="0.15" />
      <circle cx="40" cy="56" r="2" fill={BLUE} opacity="0.1" />
      <g opacity="0.2">
        <path d="M28 140l5 5M33 140l-5 5" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M164 140l4 4M168 140l-4 4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
      </g>

      <ellipse cx="100" cy="156" rx="82" ry="5" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}
