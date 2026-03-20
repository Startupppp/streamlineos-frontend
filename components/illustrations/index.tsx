import { cn } from "@/lib/utils";
const GOLD = "#bd882c";
const BLUE = "#0f2b7f";
const GOLD_LIGHT = "#d4a84a";
const BLUE_LIGHT = "#1a3fa0";
const SKIN = "#ffb8b8";
const SKIN_SHADOW = "#e6a0a0";
const HAIR = "#2f2e41";

interface IllustrationProps {
  className?: string;
}

function Wrapper({ className, children }: IllustrationProps & { children: React.ReactNode }) {
  return (
    <svg
      className={cn("w-32 h-32", className)}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function EmptyInboxIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      
      <circle cx="100" cy="100" r="80" fill={BLUE} opacity="0.04" />
      
      <rect x="40" y="80" width="120" height="70" rx="8" fill="white" stroke={BLUE} strokeWidth="2" />
      <path d="M40 105h35l8-15h34l8 15h35" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" fill="none" />
      <rect x="40" y="80" width="120" height="25" rx="8" fill={BLUE} opacity="0.06" />
      
      <g transform="translate(75, 30) rotate(-8)">
        <rect width="50" height="35" rx="4" fill={GOLD_LIGHT} opacity="0.2" stroke={GOLD} strokeWidth="1.5" />
        <path d="M0 4l25 16 25-16" stroke={GOLD} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>
      
      <circle cx="148" cy="62" r="12" fill={SKIN} />
      <circle cx="148" cy="56" r="14" fill={HAIR} />
      <ellipse cx="148" cy="50" rx="10" ry="6" fill={HAIR} />
      <rect x="138" y="72" width="20" height="18" rx="4" fill={BLUE} />
      
      <circle cx="55" cy="50" r="3" fill={GOLD} opacity="0.3" />
      <circle cx="165" cy="40" r="2" fill={GOLD} opacity="0.4" />
      <path d="M42 65l3-3 3 3-3 3z" fill={GOLD} opacity="0.25" />
      
      <line x1="60" y1="120" x2="140" y2="120" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.15" />
      <line x1="70" y1="132" x2="130" y2="132" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.1" />
    </Wrapper>
  );
}

export function EmptyProjectsIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      
      <ellipse cx="100" cy="110" rx="75" ry="50" fill={BLUE} opacity="0.04" />
      
      <path d="M30 65h50l10-15h70a6 6 0 016 6v80a6 6 0 01-6 6H30a6 6 0 01-6-6V71a6 6 0 016-6z" fill={BLUE} opacity="0.08" stroke={BLUE} strokeWidth="2" />
      
      <rect x="24" y="75" width="152" height="67" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      
      <rect x="24" y="75" width="152" height="8" rx="4" fill={GOLD} opacity="0.15" />
      
      <circle cx="100" cy="38" r="14" fill={SKIN} />
      <ellipse cx="100" cy="30" rx="12" ry="10" fill={HAIR} />
      <rect x="88" y="50" width="24" height="28" rx="6" fill={GOLD} />
      
      <path d="M88 58l-16 14" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <path d="M112 58l16 14" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      
      <circle cx="100" cy="110" r="14" fill={GOLD} opacity="0.12" />
      <line x1="100" y1="102" x2="100" y2="118" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="92" y1="110" x2="108" y2="110" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
      
      <circle cx="45" cy="100" r="3" fill={BLUE} opacity="0.1" />
      <circle cx="155" cy="95" r="2" fill={GOLD} opacity="0.2" />
    </Wrapper>
  );
}

export function EmptyTeamIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      
      <circle cx="100" cy="105" r="70" fill={BLUE} opacity="0.03" />
      
      <ellipse cx="100" cy="160" rx="70" ry="6" fill={BLUE} opacity="0.06" />
      
      <circle cx="100" cy="58" r="16" fill={SKIN} />
      <ellipse cx="100" cy="48" rx="14" ry="12" fill={HAIR} />
      <rect x="84" y="72" width="32" height="38" rx="8" fill={BLUE} />
      <rect x="90" y="110" width="8" height="30" rx="3" fill={BLUE} opacity="0.8" />
      <rect x="102" y="110" width="8" height="30" rx="3" fill={BLUE} opacity="0.8" />
      
      <circle cx="82" cy="92" r="5" fill={SKIN} />
      <circle cx="118" cy="92" r="5" fill={SKIN} />
      
      <circle cx="45" cy="78" r="12" fill={SKIN} opacity="0.7" />
      <ellipse cx="45" cy="70" rx="10" ry="9" fill={HAIR} opacity="0.7" />
      <rect x="33" y="88" width="24" height="30" rx="6" fill={GOLD} opacity="0.6" />
      <rect x="37" y="118" width="6" height="22" rx="2" fill={GOLD} opacity="0.4" />
      <rect x="45" y="118" width="6" height="22" rx="2" fill={GOLD} opacity="0.4" />
      
      <circle cx="155" cy="78" r="12" fill={SKIN} opacity="0.7" />
      <ellipse cx="155" cy="70" rx="10" ry="9" fill={HAIR} opacity="0.7" />
      <rect x="143" y="88" width="24" height="30" rx="6" fill={GOLD} opacity="0.6" />
      <rect x="147" y="118" width="6" height="22" rx="2" fill={GOLD} opacity="0.4" />
      <rect x="155" y="118" width="6" height="22" rx="2" fill={GOLD} opacity="0.4" />
      
      <path d="M68 80q16-10 32 0" stroke={GOLD} strokeWidth="1.5" strokeDasharray="4 3" fill="none" opacity="0.3" />
      <path d="M118 80q16-10 32 0" stroke={GOLD} strokeWidth="1.5" strokeDasharray="4 3" fill="none" opacity="0.3" />
      
      <circle cx="170" cy="65" r="10" fill={GOLD} opacity="0.15" />
      <line x1="170" y1="60" x2="170" y2="70" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
      <line x1="165" y1="65" x2="175" y2="65" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
    </Wrapper>
  );
}

export function EmptyTasksIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      
      <circle cx="100" cy="100" r="75" fill={GOLD} opacity="0.03" />
      
      <rect x="50" y="30" width="100" height="140" rx="10" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="50" y="30" width="100" height="20" rx="10" fill={BLUE} opacity="0.06" />
      
      <rect x="75" y="20" width="50" height="20" rx="6" fill={BLUE} opacity="0.15" stroke={BLUE} strokeWidth="1.5" />
      <circle cx="100" cy="30" r="4" fill={BLUE} opacity="0.2" />
      
      <rect x="62" y="62" width="16" height="16" rx="4" fill={GOLD} opacity="0.15" stroke={GOLD} strokeWidth="1.5" />
      <path d="M66 70l4 4 8-8" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="86" y1="70" x2="136" y2="70" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      
      <rect x="62" y="90" width="16" height="16" rx="4" stroke={BLUE} strokeWidth="1.5" opacity="0.25" />
      <line x1="86" y1="98" x2="128" y2="98" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      
      <rect x="62" y="118" width="16" height="16" rx="4" stroke={BLUE} strokeWidth="1.5" opacity="0.15" />
      <line x1="86" y1="126" x2="120" y2="126" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.12" />
      
      <circle cx="32" cy="95" r="12" fill={SKIN} />
      <ellipse cx="32" cy="87" rx="10" ry="9" fill={HAIR} />
      <rect x="22" y="105" width="20" height="26" rx="5" fill={GOLD} />
      <path d="M42 112l10 6" stroke={SKIN} strokeWidth="4" strokeLinecap="round" />
      <rect x="24" y="131" width="7" height="20" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="33" y="131" width="7" height="20" rx="3" fill={BLUE} opacity="0.7" />
      
      <g transform="translate(158, 55) rotate(25)">
        <rect width="6" height="40" rx="2" fill={GOLD} />
        <polygon points="0,40 6,40 3,48" fill={SKIN_SHADOW} />
      </g>
    </Wrapper>
  );
}

export function EmptyDocumentsIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      
      <circle cx="105" cy="100" r="72" fill={BLUE} opacity="0.03" />
      
      <rect x="62" y="28" width="85" height="110" rx="6" fill={BLUE} opacity="0.06" stroke={BLUE} strokeWidth="1" />
      
      <rect x="52" y="38" width="85" height="110" rx="6" fill="white" stroke={BLUE} strokeWidth="1.5" opacity="0.4" />
      
      <rect x="42" y="48" width="85" height="110" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      
      <path d="M107 48l20 20h-14a6 6 0 01-6-6V48z" fill={GOLD} opacity="0.1" stroke={BLUE} strokeWidth="1.5" />
      
      <line x1="56" y1="80" x2="112" y2="80" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      <line x1="56" y1="94" x2="100" y2="94" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.15" />
      <line x1="56" y1="108" x2="90" y2="108" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.12" />
      
      <circle cx="98" cy="135" r="10" fill={GOLD} opacity="0.15" stroke={GOLD} strokeWidth="1.5" />
      <path d="M93 135l3 3 7-7" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      
      <circle cx="160" cy="78" r="14" fill={SKIN} />
      <ellipse cx="160" cy="68" rx="12" ry="10" fill={HAIR} />
      <rect x="148" y="90" width="24" height="30" rx="6" fill={BLUE} />
      <path d="M148 100l-20 8" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <rect x="150" y="120" width="8" height="25" rx="3" fill={BLUE} opacity="0.8" />
      <rect x="160" y="120" width="8" height="25" rx="3" fill={BLUE} opacity="0.8" />
    </Wrapper>
  );
}

export function EmptyTimeIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      
      <circle cx="95" cy="95" r="78" fill={GOLD} opacity="0.03" />
      
      <circle cx="100" cy="88" r="52" fill="white" stroke={BLUE} strokeWidth="2.5" />
      <circle cx="100" cy="88" r="46" fill={BLUE} opacity="0.03" />
      
      <circle cx="100" cy="88" r="52" stroke={GOLD} strokeWidth="1" strokeDasharray="6 14" opacity="0.3" />
      
      <circle cx="100" cy="88" r="4" fill={BLUE} />
      
      <line x1="100" y1="88" x2="100" y2="56" stroke={BLUE} strokeWidth="3" strokeLinecap="round" />
      
      <line x1="100" y1="88" x2="130" y2="78" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      
      <line x1="100" y1="40" x2="100" y2="46" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <line x1="148" y1="88" x2="142" y2="88" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <line x1="100" y1="136" x2="100" y2="130" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <line x1="52" y1="88" x2="58" y2="88" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      
      <circle cx="38" cy="120" r="11" fill={SKIN} />
      <ellipse cx="38" cy="112" rx="9" ry="8" fill={HAIR} />
      <rect x="28" y="130" width="20" height="22" rx="5" fill={GOLD} />
      <rect x="30" y="152" width="7" height="18" rx="3" fill={BLUE} opacity="0.6" />
      <rect x="39" y="152" width="7" height="18" rx="3" fill={BLUE} opacity="0.6" />
      
      <text x="54" y="108" fill={GOLD} opacity="0.35" fontSize="10" fontWeight="bold">z</text>
      <text x="60" y="100" fill={GOLD} opacity="0.25" fontSize="8" fontWeight="bold">z</text>
      <text x="64" y="94" fill={GOLD} opacity="0.15" fontSize="6" fontWeight="bold">z</text>
    </Wrapper>
  );
}

export function EmptyExpensesIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      
      <ellipse cx="100" cy="110" rx="78" ry="55" fill={GOLD} opacity="0.04" />
      
      <path d="M55 25h90v130l-10-7-10 7-10-7-10 7-10-7-10 7-10-7-10 7V25z" fill="white" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" />
      
      <rect x="55" y="25" width="90" height="22" fill={BLUE} opacity="0.06" />
      <line x1="75" y1="36" x2="125" y2="36" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.25" />
      
      <circle cx="100" cy="75" r="18" fill={GOLD} opacity="0.1" stroke={GOLD} strokeWidth="1.5" />
      <text x="100" y="81" textAnchor="middle" fill={GOLD} fontSize="18" fontWeight="bold">$</text>
      
      <line x1="70" y1="105" x2="130" y2="105" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" opacity="0.15" />
      <line x1="75" y1="117" x2="125" y2="117" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" opacity="0.12" />
      
      <line x1="65" y1="130" x2="135" y2="130" stroke={BLUE} strokeWidth="1" strokeDasharray="4 3" opacity="0.15" />
      <line x1="85" y1="140" x2="135" y2="140" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      
      <circle cx="30" cy="82" r="13" fill={SKIN} />
      <ellipse cx="30" cy="73" rx="11" ry="10" fill={HAIR} />
      <rect x="18" y="93" width="24" height="28" rx="6" fill={BLUE} />
      <path d="M42 100l14 4" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <rect x="21" y="121" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="30" y="121" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      
      <ellipse cx="165" cy="138" rx="12" ry="4" fill={GOLD} opacity="0.2" />
      <ellipse cx="165" cy="134" rx="12" ry="4" fill={GOLD} opacity="0.25" />
      <ellipse cx="165" cy="130" rx="12" ry="4" fill={GOLD} opacity="0.3" stroke={GOLD} strokeWidth="1" />
    </Wrapper>
  );
}

export function EmptyDevicesIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      
      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />
      
      <rect x="30" y="40" width="120" height="80" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      
      <rect x="36" y="46" width="108" height="64" rx="3" fill={BLUE} opacity="0.04" />
      
      <rect x="44" y="54" width="40" height="6" rx="2" fill={GOLD} opacity="0.2" />
      <rect x="44" y="66" width="92" height="4" rx="2" fill={BLUE} opacity="0.08" />
      <rect x="44" y="76" width="72" height="4" rx="2" fill={BLUE} opacity="0.06" />
      <rect x="44" y="86" width="56" height="4" rx="2" fill={BLUE} opacity="0.04" />
      
      <circle cx="90" cy="43" r="1.5" fill={BLUE} opacity="0.2" />
      
      <path d="M20 120h140l-10 16H30l-10-16z" fill="white" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" />
      <line x1="70" y1="128" x2="110" y2="128" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      
      <circle cx="90" cy="122" r="2" fill={GOLD} opacity="0.4" />
      
      <circle cx="164" cy="68" r="12" fill={SKIN} />
      <ellipse cx="164" cy="60" rx="10" ry="9" fill={HAIR} />
      <rect x="154" y="78" width="20" height="24" rx="5" fill={GOLD} />
      <path d="M154 88l-6 10" stroke={SKIN} strokeWidth="4" strokeLinecap="round" />
      <rect x="156" y="102" width="6" height="18" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="164" y="102" width="6" height="18" rx="3" fill={BLUE} opacity="0.7" />
      
      <path d="M28 52l2-4 2 4-4 0z" fill={GOLD} opacity="0.25" />
    </Wrapper>
  );
}

export function EmptySearchIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      
      <circle cx="95" cy="100" r="78" fill={BLUE} opacity="0.03" />
      
      <circle cx="85" cy="78" r="36" fill="white" stroke={BLUE} strokeWidth="3" />
      <circle cx="85" cy="78" r="28" fill={BLUE} opacity="0.04" />
      
      <line x1="112" y1="105" x2="140" y2="133" stroke={GOLD} strokeWidth="6" strokeLinecap="round" />
      <line x1="112" y1="105" x2="140" y2="133" stroke={GOLD_LIGHT} strokeWidth="4" strokeLinecap="round" />
      
      <text x="85" y="88" textAnchor="middle" fill={BLUE} fontSize="28" fontWeight="bold" opacity="0.15">?</text>
      
      <circle cx="160" cy="55" r="13" fill={SKIN} />
      <ellipse cx="160" cy="46" rx="11" ry="10" fill={HAIR} />
      <rect x="148" y="66" width="24" height="30" rx="6" fill={BLUE} />
      <path d="M148 76l-14 14" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <rect x="150" y="96" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="161" y="96" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      
      <circle cx="40" cy="140" r="4" fill={GOLD} opacity="0.15" />
      <circle cx="55" cy="148" r="2.5" fill={BLUE} opacity="0.1" />
      <circle cx="30" cy="128" r="2" fill={GOLD} opacity="0.1" />
      
      <g opacity="0.2">
        <path d="M50 42l5 5M55 42l-5 5" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M28 68l4 4M32 68l-4 4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </Wrapper>
  );
}

export function EmptyActivityIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      
      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />
      
      <line x1="60" y1="30" x2="60" y2="175" stroke={BLUE} strokeWidth="2" opacity="0.12" />
      
      <circle cx="60" cy="50" r="8" fill={GOLD} opacity="0.2" stroke={GOLD} strokeWidth="1.5" />
      <circle cx="60" cy="50" r="3" fill={GOLD} opacity="0.5" />
      <rect x="78" y="42" width="80" height="16" rx="4" fill={BLUE} opacity="0.06" stroke={BLUE} strokeWidth="1" />
      <line x1="86" y1="50" x2="148" y2="50" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      
      <circle cx="60" cy="90" r="8" fill="white" stroke={BLUE} strokeWidth="1.5" opacity="0.3" />
      <rect x="78" y="82" width="70" height="16" rx="4" fill={BLUE} opacity="0.04" stroke={BLUE} strokeWidth="1" />
      <line x1="86" y1="90" x2="138" y2="90" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.12" />
      
      <circle cx="60" cy="130" r="8" fill="white" stroke={BLUE} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.2" />
      <rect x="78" y="122" width="60" height="16" rx="4" stroke={BLUE} strokeWidth="1" strokeDasharray="4 3" opacity="0.06" />
      
      <circle cx="160" cy="100" r="14" fill={SKIN} />
      <ellipse cx="160" cy="90" rx="12" ry="10" fill={HAIR} />
      <rect x="148" y="112" width="24" height="30" rx="6" fill={GOLD} />
      
      <rect x="137" y="118" width="14" height="18" rx="2" fill="white" stroke={BLUE} strokeWidth="1" />
      <line x1="140" y1="124" x2="148" y2="124" stroke={BLUE} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <line x1="140" y1="129" x2="146" y2="129" stroke={BLUE} strokeWidth="1" strokeLinecap="round" opacity="0.2" />
      <rect x="150" y="142" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="161" y="142" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
    </Wrapper>
  );
}

export function EmptyCalendarIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      
      <circle cx="100" cy="105" r="75" fill={GOLD} opacity="0.03" />
      
      <rect x="28" y="42" width="130" height="115" rx="8" fill="white" stroke={BLUE} strokeWidth="2" />
      
      <rect x="28" y="42" width="130" height="30" rx="8" fill={BLUE} opacity="0.08" />
      <rect x="28" y="62" width="130" height="10" fill={BLUE} opacity="0.08" />
      
      <line x1="62" y1="32" x2="62" y2="50" stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" opacity="0.4" />
      <line x1="124" y1="32" x2="124" y2="50" stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" opacity="0.4" />
      
      <rect x="70" y="48" width="46" height="6" rx="2" fill={BLUE} opacity="0.15" />
      
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={`dh-${i}`} x={38 + i * 16} y="78" width="8" height="3" rx="1" fill={BLUE} opacity="0.15" />
      ))}
      
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3, 4, 5, 6].map((col) => (
          <rect
            key={`d-${row}-${col}`}
            x={36 + col * 16}
            y={90 + row * 18}
            width="12"
            height="12"
            rx="3"
            fill={row === 0 && col === 3 ? GOLD : BLUE}
            opacity={row === 0 && col === 3 ? 0.15 : 0.04}
          />
        ))
      )}
      
      <rect x="84" y="90" width="12" height="12" rx="3" stroke={GOLD} strokeWidth="1.5" fill="none" opacity="0.4" />
      
      <circle cx="174" cy="80" r="11" fill={SKIN} />
      <ellipse cx="174" cy="72" rx="9" ry="8" fill={HAIR} />
      <rect x="164" y="89" width="20" height="24" rx="5" fill={GOLD} />
      <rect x="166" y="113" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />
      <rect x="174" y="113" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />
    </Wrapper>
  );
}

export function EmptySprintIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      
      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />
      
      <rect x="14" y="40" width="48" height="100" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="14" y="40" width="48" height="18" rx="6" fill={BLUE} opacity="0.06" />
      <rect x="22" y="46" width="28" height="5" rx="2" fill={BLUE} opacity="0.2" />
      
      <rect x="20" y="66" width="36" height="18" rx="3" fill={GOLD} opacity="0.1" stroke={GOLD} strokeWidth="1" />
      <rect x="24" y="71" width="20" height="3" rx="1" fill={GOLD} opacity="0.2" />
      <rect x="20" y="90" width="36" height="18" rx="3" stroke={BLUE} strokeWidth="1" strokeDasharray="3 3" opacity="0.12" />
      
      <rect x="70" y="40" width="48" height="100" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="70" y="40" width="48" height="18" rx="6" fill={GOLD} opacity="0.06" />
      <rect x="78" y="46" width="28" height="5" rx="2" fill={GOLD} opacity="0.2" />
      
      <rect x="76" y="66" width="36" height="18" rx="3" fill={BLUE} opacity="0.08" stroke={BLUE} strokeWidth="1" />
      <rect x="80" y="71" width="24" height="3" rx="1" fill={BLUE} opacity="0.15" />
      
      <rect x="126" y="40" width="48" height="100" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="126" y="40" width="48" height="18" rx="6" fill={BLUE} opacity="0.04" />
      <rect x="134" y="46" width="28" height="5" rx="2" fill={BLUE} opacity="0.12" />
      
      <path d="M64 76h4" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M120 76h4" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      
      <circle cx="94" cy="155" r="12" fill={SKIN} />
      <ellipse cx="94" cy="147" rx="10" ry="9" fill={HAIR} />
      <rect x="84" y="165" width="20" height="18" rx="5" fill={BLUE} />
      
      <path d="M104 170l16-26" stroke={SKIN} strokeWidth="4.5" strokeLinecap="round" />
      
      <circle cx="150" cy="32" r="3" fill={GOLD} opacity="0.25" />
      <path d="M158 28l2-4 2 4-2 4z" fill={GOLD} opacity="0.2" />
    </Wrapper>
  );
}

export function EmptyMailIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      
      <circle cx="100" cy="100" r="78" fill={GOLD} opacity="0.03" />
      
      <rect x="30" y="60" width="140" height="90" rx="8" fill="white" stroke={BLUE} strokeWidth="2" />
      <path d="M30 68l70 42 70-42" stroke={BLUE} strokeWidth="2" fill="none" strokeLinejoin="round" />
      <rect x="30" y="60" width="140" height="16" rx="8" fill={BLUE} opacity="0.06" />
      
      <path d="M30 60l70 38 70-38" stroke={BLUE} strokeWidth="2" fill="white" strokeLinejoin="round" />
      
      <circle cx="100" cy="125" r="12" fill={GOLD} opacity="0.15" stroke={GOLD} strokeWidth="1.5" />
      <path d="M95 125l3 3 7-7" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      
      <circle cx="160" cy="38" r="13" fill={SKIN} />
      <ellipse cx="160" cy="29" rx="11" ry="10" fill={HAIR} />
      <rect x="148" y="49" width="24" height="28" rx="6" fill={GOLD} />
      
      <path d="M172 55l12-12" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <circle cx="184" cy="43" r="4" fill={SKIN} />
      <rect x="150" y="77" width="7" height="20" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="161" y="77" width="7" height="20" rx="3" fill={BLUE} opacity="0.7" />
      
      <circle cx="45" cy="45" r="3" fill={GOLD} opacity="0.2" />
      <path d="M55 38l2-4 2 4-2 4z" fill={BLUE} opacity="0.15" />
      <circle cx="135" cy="35" r="2" fill={GOLD} opacity="0.15" />
    </Wrapper>
  );
}

export function EmptyPersonIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      
      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />
      
      <circle cx="100" cy="72" r="30" fill={BLUE} opacity="0.05" stroke={BLUE} strokeWidth="2" strokeDasharray="6 4" />
      <text x="100" y="82" textAnchor="middle" fill={BLUE} fontSize="32" fontWeight="bold" opacity="0.1">?</text>
      
      <path d="M65 140a35 35 0 0170 0" fill={BLUE} opacity="0.05" stroke={BLUE} strokeWidth="2" strokeDasharray="6 4" />
      
      <circle cx="44" cy="88" r="13" fill={SKIN} />
      <ellipse cx="44" cy="79" rx="11" ry="10" fill={HAIR} />
      <rect x="32" y="99" width="24" height="28" rx="6" fill={GOLD} />
      
      <path d="M56 105l14-6" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <rect x="34" y="127" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="45" y="127" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      
      <circle cx="150" cy="108" r="16" fill="white" stroke={GOLD} strokeWidth="2" />
      <line x1="161" y1="119" x2="174" y2="132" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" />
      
      <circle cx="168" cy="60" r="3" fill={GOLD} opacity="0.2" />
      <path d="M175 72l2-3 2 3-2 3z" fill={BLUE} opacity="0.15" />
    </Wrapper>
  );
}

export function EmptyWfhIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      <circle cx="100" cy="100" r="78" fill={GOLD} opacity="0.03" />

      <rect x="120" y="22" width="50" height="40" rx="4" fill="white" stroke={BLUE} strokeWidth="1.5" />
      <line x1="120" y1="32" x2="170" y2="32" stroke={BLUE} strokeWidth="1.5" opacity="0.2" />
      <circle cx="145" cy="27" r="2" fill={GOLD} opacity="0.3" />
      <line x1="145" y1="32" x2="145" y2="62" stroke={BLUE} strokeWidth="1" opacity="0.1" />
      <line x1="120" y1="47" x2="170" y2="47" stroke={BLUE} strokeWidth="1" opacity="0.1" />
      <circle cx="155" cy="42" r="5" fill={GOLD} opacity="0.25" />
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={`ws-${angle}`}
            x1={155 + Math.cos(rad) * 7}
            y1={42 + Math.sin(rad) * 7}
            x2={155 + Math.cos(rad) * 9}
            y2={42 + Math.sin(rad) * 9}
            stroke={GOLD}
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.2"
          />
        );
      })}

      <rect x="20" y="115" width="120" height="6" rx="2" fill={BLUE} opacity="0.12" />
      <rect x="30" y="121" width="6" height="30" rx="2" fill={BLUE} opacity="0.08" />
      <rect x="124" y="121" width="6" height="30" rx="2" fill={BLUE} opacity="0.08" />

      <rect x="45" y="92" width="60" height="23" rx="3" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="50" y="97" width="50" height="14" rx="2" fill={BLUE} opacity="0.05" />
      <rect x="54" y="100" width="18" height="3" rx="1" fill={GOLD} opacity="0.25" />
      <rect x="54" y="106" width="30" height="2" rx="1" fill={BLUE} opacity="0.1" />
      <path d="M40 115h70l-4-5H44l-4 5z" fill={BLUE} opacity="0.08" stroke={BLUE} strokeWidth="1.5" />

      <rect x="115" y="103" width="12" height="12" rx="2" fill="white" stroke={GOLD} strokeWidth="1.5" />
      <path d="M127 107a4 4 0 010 6" stroke={GOLD} strokeWidth="1" fill="none" />
      <path d="M118 100q1-3 3 0" stroke={GOLD} strokeWidth="0.8" fill="none" opacity="0.3" />
      <path d="M122 98q1-4 3 0" stroke={GOLD} strokeWidth="0.8" fill="none" opacity="0.2" />

      <circle cx="75" cy="60" r="14" fill={SKIN} />
      <ellipse cx="75" cy="51" rx="12" ry="10" fill={HAIR} />
      <rect x="63" y="72" width="24" height="28" rx="6" fill={GOLD} />
      <path d="M63 82l-10 18" stroke={SKIN} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M87 82l10 18" stroke={SKIN} strokeWidth="4.5" strokeLinecap="round" />
      <rect x="65" y="100" width="8" height="20" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="77" y="100" width="8" height="20" rx="3" fill={BLUE} opacity="0.7" />

      <rect x="148" y="98" width="10" height="17" rx="3" fill={GOLD} opacity="0.2" />
      <circle cx="153" cy="92" r="8" fill="#4ade80" opacity="0.2" />
      <circle cx="148" cy="88" r="5" fill="#4ade80" opacity="0.15" />

      <g transform="translate(28, 50)" opacity="0.2">
        <path d="M6 14a2 2 0 100-4 2 2 0 000 4z" fill={BLUE} />
        <path d="M0 6a9 9 0 0112 0" stroke={BLUE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M2 9a6 6 0 018 0" stroke={BLUE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>

      <ellipse cx="80" cy="158" rx="70" ry="4" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}

export function EmptyApprovalIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />

      <rect x="55" y="28" width="80" height="120" rx="8" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="75" y="20" width="40" height="16" rx="5" fill={BLUE} opacity="0.12" stroke={BLUE} strokeWidth="1.5" />
      <circle cx="95" cy="28" r="3" fill={BLUE} opacity="0.15" />

      <rect x="68" y="48" width="14" height="14" rx="3" fill={GOLD} opacity="0.15" stroke={GOLD} strokeWidth="1.5" />
      <path d="M71 55l3 3 7-7" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="90" y1="55" x2="122" y2="55" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.25" />

      <rect x="68" y="72" width="14" height="14" rx="3" fill={GOLD} opacity="0.15" stroke={GOLD} strokeWidth="1.5" />
      <path d="M71 79l3 3 7-7" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="90" y1="79" x2="118" y2="79" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.2" />

      <rect x="68" y="96" width="14" height="14" rx="3" stroke={BLUE} strokeWidth="1.5" opacity="0.2" />
      <line x1="90" y1="103" x2="114" y2="103" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.12" />

      <rect x="68" y="118" width="14" height="14" rx="3" stroke={BLUE} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.12" />
      <line x1="90" y1="125" x2="108" y2="125" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.08" />

      <circle cx="160" cy="72" r="14" fill={SKIN} />
      <ellipse cx="160" cy="63" rx="12" ry="10" fill={HAIR} />
      <rect x="148" y="84" width="24" height="30" rx="6" fill={BLUE} />
      <path d="M148 94l-14 14" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <g transform="translate(128, 110) rotate(-45)">
        <rect width="4" height="22" rx="1.5" fill={GOLD} />
        <polygon points="0,22 4,22 2,26" fill={GOLD} opacity="0.7" />
      </g>
      <rect x="150" y="114" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="161" y="114" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />

      <circle cx="42" cy="130" r="16" fill={GOLD} opacity="0.1" stroke={GOLD} strokeWidth="1.5" />
      <path d="M34 130l5 5 11-11" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      <circle cx="45" cy="42" r="3" fill={GOLD} opacity="0.2" />
      <path d="M170 48l2-4 2 4-2 4z" fill={GOLD} opacity="0.2" />

      <ellipse cx="100" cy="155" rx="70" ry="4" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}

export function NotFoundIllustration({ className }: IllustrationProps) {
  return (
    <svg
      className={cn("w-64 h-64", className)}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="200" cy="200" r="170" fill={BLUE} opacity="0.03" />
      <circle cx="200" cy="200" r="140" fill={GOLD} opacity="0.03" />

      <text
        x="200"
        y="230"
        textAnchor="middle"
        fill={BLUE}
        fontSize="130"
        fontWeight="900"
        opacity="0.04"
        fontFamily="Inter, sans-serif"
      >
        404
      </text>

      <circle cx="200" cy="175" r="65" fill="white" stroke={BLUE} strokeWidth="3" />
      <circle cx="200" cy="175" r="55" fill={BLUE} opacity="0.03" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const major = angle % 90 === 0;
        return (
          <line
            key={`cm-${angle}`}
            x1={200 + Math.cos(rad) * (major ? 48 : 51)}
            y1={175 + Math.sin(rad) * (major ? 48 : 51)}
            x2={200 + Math.cos(rad) * 55}
            y2={175 + Math.sin(rad) * 55}
            stroke={BLUE}
            strokeWidth={major ? 2.5 : 1.5}
            strokeLinecap="round"
            opacity={major ? 0.3 : 0.15}
          />
        );
      })}
      <line x1="200" y1="175" x2="185" y2="135" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
      <line x1="200" y1="175" x2="220" y2="210" stroke={BLUE} strokeWidth="3" strokeLinecap="round" opacity="0.3" />
      <circle cx="200" cy="175" r="6" fill={GOLD} />
      <circle cx="200" cy="175" r="3" fill="white" />
      <g opacity="0.15">
        <line x1="165" y1="140" x2="235" y2="210" stroke={BLUE} strokeWidth="5" strokeLinecap="round" />
        <line x1="235" y1="140" x2="165" y2="210" stroke={BLUE} strokeWidth="5" strokeLinecap="round" />
      </g>

      <circle cx="95" cy="200" r="22" fill={SKIN} />
      <ellipse cx="95" cy="186" rx="20" ry="16" fill={HAIR} />
      <circle cx="88" cy="200" r="2" fill={HAIR} />
      <circle cx="102" cy="200" r="2" fill={HAIR} />
      <path d="M88 210q7 3 14 0" stroke={HAIR} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <rect x="77" y="220" width="36" height="44" rx="10" fill={GOLD} />
      <path d="M113 230q12-20 8-36" stroke={SKIN} strokeWidth="7" strokeLinecap="round" fill="none" />
      <circle cx="118" cy="194" r="5" fill={SKIN} />
      <path d="M77 240l-14 16" stroke={SKIN} strokeWidth="7" strokeLinecap="round" />
      <rect x="82" y="264" width="10" height="32" rx="4" fill={BLUE} opacity="0.7" />
      <rect x="96" y="264" width="10" height="32" rx="4" fill={BLUE} opacity="0.7" />
      <ellipse cx="87" cy="298" rx="8" ry="4" fill={HAIR} />
      <ellipse cx="101" cy="298" rx="8" ry="4" fill={HAIR} />

      <text x="132" y="178" fill={GOLD} opacity="0.3" fontSize="22" fontWeight="bold">?</text>
      <text x="146" y="158" fill={GOLD} opacity="0.2" fontSize="16" fontWeight="bold">?</text>
      <text x="122" y="160" fill={GOLD} opacity="0.15" fontSize="12" fontWeight="bold">?</text>

      <path
        d="M280 280q20-20 30-10q10 10 30-5q20-15 30-5"
        stroke={BLUE}
        strokeWidth="3"
        strokeDasharray="8 6"
        fill="none"
        opacity="0.12"
        strokeLinecap="round"
      />
      <rect x="305" y="240" width="6" height="40" rx="2" fill={BLUE} opacity="0.15" />
      <rect x="290" y="232" width="36" height="18" rx="3" fill={GOLD} opacity="0.15" stroke={GOLD} strokeWidth="1.5" />
      <line x1="298" y1="241" x2="318" y2="241" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.2" />

      <circle cx="320" cy="140" r="4" fill={GOLD} opacity="0.15" />
      <circle cx="340" cy="160" r="2.5" fill={BLUE} opacity="0.1" />
      <circle cx="75" cy="310" r="3" fill={GOLD} opacity="0.12" />
      <path d="M60 155l3-5 3 5-3 5z" fill={GOLD} opacity="0.15" />
      <path d="M330 200l2-4 2 4-2 4z" fill={BLUE} opacity="0.1" />

      <ellipse cx="200" cy="320" rx="140" ry="8" fill={BLUE} opacity="0.04" />
    </svg>
  );
}

export function EmptyTargetIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Background */}
      <circle cx="100" cy="100" r="78" fill={GOLD} opacity="0.03" />

      {/* Target board stand */}
      <rect x="128" y="70" width="3" height="85" rx="1.5" fill={BLUE} opacity="0.15" />
      <rect x="115" y="150" width="30" height="4" rx="2" fill={BLUE} opacity="0.12" />

      {/* Target board */}
      <circle cx="130" cy="60" r="38" fill="white" stroke={BLUE} strokeWidth="2" />
      <circle cx="130" cy="60" r="30" fill="none" stroke={GOLD} strokeWidth="2" opacity="0.25" />
      <circle cx="130" cy="60" r="22" fill="none" stroke={GOLD} strokeWidth="2" opacity="0.4" />
      <circle cx="130" cy="60" r="14" fill="none" stroke={GOLD} strokeWidth="2" opacity="0.6" />
      <circle cx="130" cy="60" r="5" fill={GOLD} />

      {/* Arrow missing */}
      <g transform="translate(148, 38) rotate(30)">
        <line x1="0" y1="0" x2="28" y2="0" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <polygon points="-2,-3 5,0 -2,3" fill={BLUE} opacity="0.5" />
        <line x1="24" y1="-3" x2="28" y2="0" stroke={GOLD} strokeWidth="1" opacity="0.5" />
        <line x1="24" y1="3" x2="28" y2="0" stroke={GOLD} strokeWidth="1" opacity="0.5" />
      </g>

      {/* Person */}
      <circle cx="58" cy="78" r="14" fill={SKIN} />
      <ellipse cx="58" cy="69" rx="12" ry="10" fill={HAIR} />
      <rect x="46" y="90" width="24" height="30" rx="6" fill={BLUE} />

      {/* Right arm pointing at target */}
      <path d="M70 98l20-12" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />

      {/* Left arm scratching head */}
      <path d="M46 98l-8-16" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <circle cx="38" cy="82" r="4" fill={SKIN} />

      {/* Legs */}
      <rect x="49" y="120" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="58" y="120" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />

      {/* Question marks */}
      <text x="72" y="72" fill={GOLD} opacity="0.35" fontSize="12" fontWeight="bold">?</text>
      <text x="80" y="62" fill={GOLD} opacity="0.2" fontSize="9" fontWeight="bold">?</text>

      {/* Decorative */}
      <circle cx="30" cy="120" r="3" fill={GOLD} opacity="0.15" />
      <circle cx="170" cy="45" r="2" fill={BLUE} opacity="0.12" />
      <ellipse cx="100" cy="155" rx="70" ry="4" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}

export function EmptyLeaderboardIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Background */}
      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />

      {/* Podium - 2nd place */}
      <rect x="38" y="110" width="40" height="42" rx="3" fill={BLUE} opacity="0.06" />
      <rect x="38" y="110" width="40" height="6" rx="3" fill={BLUE} opacity="0.12" />
      <text x="58" y="138" fontSize="16" fill={BLUE} opacity="0.15" textAnchor="middle" fontWeight="bold">2</text>

      {/* Podium - 1st place */}
      <rect x="82" y="90" width="40" height="62" rx="3" fill={GOLD} opacity="0.08" />
      <rect x="82" y="90" width="40" height="6" rx="3" fill={GOLD} opacity="0.2" />
      <text x="102" y="128" fontSize="16" fill={GOLD} opacity="0.25" textAnchor="middle" fontWeight="bold">1</text>

      {/* Podium - 3rd place */}
      <rect x="126" y="122" width="40" height="30" rx="3" fill={BLUE} opacity="0.04" />
      <rect x="126" y="122" width="40" height="6" rx="3" fill={BLUE} opacity="0.08" />
      <text x="146" y="146" fontSize="16" fill={BLUE} opacity="0.1" textAnchor="middle" fontWeight="bold">3</text>

      {/* Trophy on 1st */}
      <g transform="translate(102, 68)">
        <path d="M-8 -14 L-6 0 Q-5 6 0 8 Q5 6 6 0 L8 -14 Z" fill={GOLD} />
        <rect x="-9" y="-16" width="18" height="3" rx="1.5" fill={GOLD_LIGHT} />
        <path d="M-8 -11 Q-14 -10 -14 -4 Q-14 2 -8 2" stroke={GOLD} strokeWidth="1.5" fill="none" />
        <path d="M8 -11 Q14 -10 14 -4 Q14 2 8 2" stroke={GOLD} strokeWidth="1.5" fill="none" />
        <rect x="-3" y="8" width="6" height="4" fill={GOLD} />
        <rect x="-5" y="12" width="10" height="2" rx="1" fill={GOLD} />
        <path d="M0 -10 L1.2 -6.5 L4.5 -6.5 L2 -4 L3 -0.5 L0 -2.5 L-3 -0.5 L-2 -4 L-4.5 -6.5 L-1.2 -6.5 Z" fill="white" opacity="0.6" />
      </g>

      {/* Ghost people (dashed outlines) */}
      <circle cx="58" cy="96" r="8" stroke={BLUE} strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.2" />
      <path d="M50 108 Q52 118 52 126 L64 126 Q64 118 66 108 Q62 105 58 105 Q54 105 50 108Z" stroke={BLUE} strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.2" />

      <circle cx="146" cy="108" r="8" stroke={BLUE} strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.15" />
      <path d="M138 120 Q140 130 140 138 L152 138 Q152 130 154 120 Q150 117 146 117 Q142 117 138 120Z" stroke={BLUE} strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.15" />

      {/* Person observing */}
      <circle cx="25" cy="105" r="12" fill={SKIN} />
      <ellipse cx="25" cy="96" rx="10" ry="9" fill={HAIR} />
      <rect x="15" y="115" width="20" height="26" rx="5" fill={GOLD} />
      <rect x="17" y="141" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />
      <rect x="27" y="141" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />

      {/* Decorative stars */}
      <path d="M170 70 L171.5 74 L176 74 L172.5 77 L174 81 L170 78 L166 81 L167.5 77 L164 74 L168.5 74 Z" fill={GOLD} opacity="0.15" />
      <circle cx="175" cy="95" r="2" fill={GOLD} opacity="0.1" />

      {/* Floor */}
      <ellipse cx="100" cy="160" rx="80" ry="5" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}

export function EmptyLeaveIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      
      <circle cx="100" cy="100" r="78" fill={GOLD} opacity="0.03" />
      
      <rect x="40" y="45" width="110" height="100" rx="8" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="40" y="45" width="110" height="28" rx="8" fill={BLUE} opacity="0.06" />
      <rect x="40" y="65" width="110" height="8" fill={BLUE} opacity="0.06" />
      
      <line x1="70" y1="36" x2="70" y2="52" stroke={BLUE} strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <line x1="120" y1="36" x2="120" y2="52" stroke={BLUE} strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      
      <rect x="75" y="52" width="40" height="5" rx="2" fill={BLUE} opacity="0.15" />
      
      {[0, 1, 2, 3, 4].map((col) => (
        <rect key={`r1-${col}`} x={50 + col * 18} y={82} width="12" height="12" rx="3" fill={BLUE} opacity="0.04" />
      ))}
      {[0, 1, 2, 3, 4].map((col) => (
        <rect key={`r2-${col}`} x={50 + col * 18} y={102} width="12" height="12" rx="3" fill={BLUE} opacity="0.04" />
      ))}
      
      <circle cx="160" cy="50" r="14" fill={GOLD} opacity="0.12" />
      <circle cx="160" cy="50" r="8" fill={GOLD} opacity="0.2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={`ray-${angle}`}
            x1={160 + Math.cos(rad) * 10}
            y1={50 + Math.sin(rad) * 10}
            x2={160 + Math.cos(rad) * 14}
            y2={50 + Math.sin(rad) * 14}
            stroke={GOLD}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.3"
          />
        );
      })}
      
      <circle cx="160" cy="105" r="12" fill={SKIN} />
      <ellipse cx="160" cy="96" rx="10" ry="9" fill={HAIR} />
      <rect x="150" y="115" width="20" height="24" rx="5" fill={GOLD} />
      <rect x="152" y="139" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />
      <rect x="162" y="139" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />
    </Wrapper>
  );
}

