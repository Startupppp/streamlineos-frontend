"use client";

import { Wrapper, GOLD, BLUE, GOLD_LIGHT, BLUE_LIGHT, type IllustrationProps } from "./_shared";

export function EmptyPayroll({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      <circle cx="100" cy="100" r="80" fill={BLUE} opacity="0.08" />
      <rect x="60" y="50" width="80" height="100" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="60" y="50" width="80" height="20" rx="6" fill={BLUE} />
      <rect x="70" y="80" width="40" height="4" rx="2" fill={GOLD} />
      <rect x="70" y="90" width="60" height="3" rx="1.5" fill={BLUE} opacity="0.2" />
      <rect x="70" y="98" width="50" height="3" rx="1.5" fill={BLUE} opacity="0.2" />
      <rect x="70" y="106" width="55" height="3" rx="1.5" fill={BLUE} opacity="0.2" />
      <line x1="65" y1="118" x2="135" y2="118" stroke={BLUE} strokeWidth="1" opacity="0.3" />
      <rect x="70" y="124" width="30" height="4" rx="2" fill={GOLD_LIGHT} />
      <rect x="110" y="124" width="20" height="4" rx="2" fill={GOLD} />
      <circle cx="155" cy="75" r="18" fill={GOLD_LIGHT} opacity="0.3" />
      <circle cx="155" cy="75" r="14" fill={GOLD} opacity="0.5" />
      <text x="155" y="80" textAnchor="middle" fontSize="14" fill="white" fontWeight="bold">₹</text>
    </Wrapper>
  );
}
