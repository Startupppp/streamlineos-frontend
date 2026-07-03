import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyWarehouseIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />

      <rect x="48" y="42" width="5" height="112" rx="2" fill={BLUE} opacity="0.15" />
      <rect x="140" y="42" width="5" height="112" rx="2" fill={BLUE} opacity="0.15" />

      <rect x="44" y="74" width="105" height="5" rx="2" fill={BLUE} opacity="0.12" />
      <rect x="44" y="112" width="105" height="5" rx="2" fill={BLUE} opacity="0.12" />
      <rect x="44" y="150" width="105" height="5" rx="2" fill={BLUE} opacity="0.12" />

      <rect x="60" y="52" width="24" height="22" rx="2" stroke={BLUE} strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.25" />
      <text x="72" y="67" textAnchor="middle" fill={BLUE} fontSize="12" fontWeight="bold" opacity="0.15">?</text>

      <rect x="96" y="90" width="26" height="22" rx="2" fill="white" stroke={BLUE} strokeWidth="2" />
      <line x1="109" y1="90" x2="109" y2="112" stroke={GOLD} strokeWidth="2" opacity="0.5" />

      <rect x="60" y="130" width="22" height="20" rx="2" fill={GOLD} opacity="0.1" stroke={GOLD} strokeWidth="1.5" />
      <rect x="118" y="132" width="18" height="18" rx="2" fill={BLUE} opacity="0.06" stroke={BLUE} strokeWidth="1.5" />

      <circle cx="170" cy="88" r="12" fill={SKIN} />
      <ellipse cx="170" cy="79" rx="10" ry="9" fill={HAIR} />
      <rect x="160" y="98" width="20" height="26" rx="5" fill={BLUE} />
      <path d="M160 106l-12 10" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <rect x="162" y="124" width="6" height="20" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="172" y="124" width="6" height="20" rx="3" fill={BLUE} opacity="0.7" />

      <circle cx="30" cy="120" r="3" fill={GOLD} opacity="0.15" />
      <circle cx="24" cy="100" r="2" fill={BLUE} opacity="0.1" />
      <g opacity="0.2">
        <path d="M32 56l5 5M37 56l-5 5" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
      </g>

      <ellipse cx="100" cy="162" rx="82" ry="5" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}
