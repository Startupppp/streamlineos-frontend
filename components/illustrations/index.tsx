import { cn } from "@/lib/utils";

// Brand colors for unDraw-style illustrations
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
      {/* Background circle */}
      <circle cx="100" cy="100" r="80" fill={BLUE} opacity="0.04" />
      {/* Inbox tray */}
      <rect x="40" y="80" width="120" height="70" rx="8" fill="white" stroke={BLUE} strokeWidth="2" />
      <path d="M40 105h35l8-15h34l8 15h35" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" fill="none" />
      <rect x="40" y="80" width="120" height="25" rx="8" fill={BLUE} opacity="0.06" />
      {/* Envelope floating */}
      <g transform="translate(75, 30) rotate(-8)">
        <rect width="50" height="35" rx="4" fill={GOLD_LIGHT} opacity="0.2" stroke={GOLD} strokeWidth="1.5" />
        <path d="M0 4l25 16 25-16" stroke={GOLD} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>
      {/* Person peeking */}
      <circle cx="148" cy="62" r="12" fill={SKIN} />
      <circle cx="148" cy="56" r="14" fill={HAIR} />
      <ellipse cx="148" cy="50" rx="10" ry="6" fill={HAIR} />
      <rect x="138" y="72" width="20" height="18" rx="4" fill={BLUE} />
      {/* Sparkles */}
      <circle cx="55" cy="50" r="3" fill={GOLD} opacity="0.3" />
      <circle cx="165" cy="40" r="2" fill={GOLD} opacity="0.4" />
      <path d="M42 65l3-3 3 3-3 3z" fill={GOLD} opacity="0.25" />
      {/* Content lines in tray */}
      <line x1="60" y1="120" x2="140" y2="120" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.15" />
      <line x1="70" y1="132" x2="130" y2="132" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.1" />
    </Wrapper>
  );
}

export function EmptyProjectsIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Background blob */}
      <ellipse cx="100" cy="110" rx="75" ry="50" fill={BLUE} opacity="0.04" />
      {/* Folder back */}
      <path d="M30 65h50l10-15h70a6 6 0 016 6v80a6 6 0 01-6 6H30a6 6 0 01-6-6V71a6 6 0 016-6z" fill={BLUE} opacity="0.08" stroke={BLUE} strokeWidth="2" />
      {/* Folder front flap */}
      <rect x="24" y="75" width="152" height="67" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      {/* Gold accent strip */}
      <rect x="24" y="75" width="152" height="8" rx="4" fill={GOLD} opacity="0.15" />
      {/* Person with clipboard */}
      <circle cx="100" cy="38" r="14" fill={SKIN} />
      <ellipse cx="100" cy="30" rx="12" ry="10" fill={HAIR} />
      <rect x="88" y="50" width="24" height="28" rx="6" fill={GOLD} />
      {/* Arms holding folder */}
      <path d="M88 58l-16 14" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <path d="M112 58l16 14" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      {/* Plus icon on folder */}
      <circle cx="100" cy="110" r="14" fill={GOLD} opacity="0.12" />
      <line x1="100" y1="102" x2="100" y2="118" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="92" y1="110" x2="108" y2="110" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
      {/* Decorative dots */}
      <circle cx="45" cy="100" r="3" fill={BLUE} opacity="0.1" />
      <circle cx="155" cy="95" r="2" fill={GOLD} opacity="0.2" />
    </Wrapper>
  );
}

export function EmptyTeamIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Background circle */}
      <circle cx="100" cy="105" r="70" fill={BLUE} opacity="0.03" />
      {/* Ground line */}
      <ellipse cx="100" cy="160" rx="70" ry="6" fill={BLUE} opacity="0.06" />
      {/* Center person (prominent) */}
      <circle cx="100" cy="58" r="16" fill={SKIN} />
      <ellipse cx="100" cy="48" rx="14" ry="12" fill={HAIR} />
      <rect x="84" y="72" width="32" height="38" rx="8" fill={BLUE} />
      <rect x="90" y="110" width="8" height="30" rx="3" fill={BLUE} opacity="0.8" />
      <rect x="102" y="110" width="8" height="30" rx="3" fill={BLUE} opacity="0.8" />
      {/* Hands */}
      <circle cx="82" cy="92" r="5" fill={SKIN} />
      <circle cx="118" cy="92" r="5" fill={SKIN} />
      {/* Left person (smaller) */}
      <circle cx="45" cy="78" r="12" fill={SKIN} opacity="0.7" />
      <ellipse cx="45" cy="70" rx="10" ry="9" fill={HAIR} opacity="0.7" />
      <rect x="33" y="88" width="24" height="30" rx="6" fill={GOLD} opacity="0.6" />
      <rect x="37" y="118" width="6" height="22" rx="2" fill={GOLD} opacity="0.4" />
      <rect x="45" y="118" width="6" height="22" rx="2" fill={GOLD} opacity="0.4" />
      {/* Right person (smaller) */}
      <circle cx="155" cy="78" r="12" fill={SKIN} opacity="0.7" />
      <ellipse cx="155" cy="70" rx="10" ry="9" fill={HAIR} opacity="0.7" />
      <rect x="143" y="88" width="24" height="30" rx="6" fill={GOLD} opacity="0.6" />
      <rect x="147" y="118" width="6" height="22" rx="2" fill={GOLD} opacity="0.4" />
      <rect x="155" y="118" width="6" height="22" rx="2" fill={GOLD} opacity="0.4" />
      {/* Connection arcs */}
      <path d="M68 80q16-10 32 0" stroke={GOLD} strokeWidth="1.5" strokeDasharray="4 3" fill="none" opacity="0.3" />
      <path d="M118 80q16-10 32 0" stroke={GOLD} strokeWidth="1.5" strokeDasharray="4 3" fill="none" opacity="0.3" />
      {/* Plus badge */}
      <circle cx="170" cy="65" r="10" fill={GOLD} opacity="0.15" />
      <line x1="170" y1="60" x2="170" y2="70" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
      <line x1="165" y1="65" x2="175" y2="65" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
    </Wrapper>
  );
}

export function EmptyTasksIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Background circle */}
      <circle cx="100" cy="100" r="75" fill={GOLD} opacity="0.03" />
      {/* Clipboard board */}
      <rect x="50" y="30" width="100" height="140" rx="10" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="50" y="30" width="100" height="20" rx="10" fill={BLUE} opacity="0.06" />
      {/* Clipboard clip */}
      <rect x="75" y="20" width="50" height="20" rx="6" fill={BLUE} opacity="0.15" stroke={BLUE} strokeWidth="1.5" />
      <circle cx="100" cy="30" r="4" fill={BLUE} opacity="0.2" />
      {/* Checklist item 1 - completed */}
      <rect x="62" y="62" width="16" height="16" rx="4" fill={GOLD} opacity="0.15" stroke={GOLD} strokeWidth="1.5" />
      <path d="M66 70l4 4 8-8" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="86" y1="70" x2="136" y2="70" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      {/* Checklist item 2 - empty */}
      <rect x="62" y="90" width="16" height="16" rx="4" stroke={BLUE} strokeWidth="1.5" opacity="0.25" />
      <line x1="86" y1="98" x2="128" y2="98" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      {/* Checklist item 3 - empty */}
      <rect x="62" y="118" width="16" height="16" rx="4" stroke={BLUE} strokeWidth="1.5" opacity="0.15" />
      <line x1="86" y1="126" x2="120" y2="126" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.12" />
      {/* Person leaning on clipboard */}
      <circle cx="32" cy="95" r="12" fill={SKIN} />
      <ellipse cx="32" cy="87" rx="10" ry="9" fill={HAIR} />
      <rect x="22" y="105" width="20" height="26" rx="5" fill={GOLD} />
      <path d="M42 112l10 6" stroke={SKIN} strokeWidth="4" strokeLinecap="round" />
      <rect x="24" y="131" width="7" height="20" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="33" y="131" width="7" height="20" rx="3" fill={BLUE} opacity="0.7" />
      {/* Pencil */}
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
      {/* Background */}
      <circle cx="105" cy="100" r="72" fill={BLUE} opacity="0.03" />
      {/* Back document */}
      <rect x="62" y="28" width="85" height="110" rx="6" fill={BLUE} opacity="0.06" stroke={BLUE} strokeWidth="1" />
      {/* Middle document */}
      <rect x="52" y="38" width="85" height="110" rx="6" fill="white" stroke={BLUE} strokeWidth="1.5" opacity="0.4" />
      {/* Front document */}
      <rect x="42" y="48" width="85" height="110" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      {/* Corner fold */}
      <path d="M107 48l20 20h-14a6 6 0 01-6-6V48z" fill={GOLD} opacity="0.1" stroke={BLUE} strokeWidth="1.5" />
      {/* Document content lines */}
      <line x1="56" y1="80" x2="112" y2="80" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      <line x1="56" y1="94" x2="100" y2="94" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.15" />
      <line x1="56" y1="108" x2="90" y2="108" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.12" />
      {/* Gold seal/stamp */}
      <circle cx="98" cy="135" r="10" fill={GOLD} opacity="0.15" stroke={GOLD} strokeWidth="1.5" />
      <path d="M93 135l3 3 7-7" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Person holding document */}
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
      {/* Background */}
      <circle cx="95" cy="95" r="78" fill={GOLD} opacity="0.03" />
      {/* Clock face */}
      <circle cx="100" cy="88" r="52" fill="white" stroke={BLUE} strokeWidth="2.5" />
      <circle cx="100" cy="88" r="46" fill={BLUE} opacity="0.03" />
      {/* Clock rim accent */}
      <circle cx="100" cy="88" r="52" stroke={GOLD} strokeWidth="1" strokeDasharray="6 14" opacity="0.3" />
      {/* Clock center */}
      <circle cx="100" cy="88" r="4" fill={BLUE} />
      {/* Hour hand */}
      <line x1="100" y1="88" x2="100" y2="56" stroke={BLUE} strokeWidth="3" strokeLinecap="round" />
      {/* Minute hand */}
      <line x1="100" y1="88" x2="130" y2="78" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      {/* Hour markers */}
      <line x1="100" y1="40" x2="100" y2="46" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <line x1="148" y1="88" x2="142" y2="88" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <line x1="100" y1="136" x2="100" y2="130" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <line x1="52" y1="88" x2="58" y2="88" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      {/* Person sitting next to clock */}
      <circle cx="38" cy="120" r="11" fill={SKIN} />
      <ellipse cx="38" cy="112" rx="9" ry="8" fill={HAIR} />
      <rect x="28" y="130" width="20" height="22" rx="5" fill={GOLD} />
      <rect x="30" y="152" width="7" height="18" rx="3" fill={BLUE} opacity="0.6" />
      <rect x="39" y="152" width="7" height="18" rx="3" fill={BLUE} opacity="0.6" />
      {/* Zzz floating (waiting) */}
      <text x="54" y="108" fill={GOLD} opacity="0.35" fontSize="10" fontWeight="bold">z</text>
      <text x="60" y="100" fill={GOLD} opacity="0.25" fontSize="8" fontWeight="bold">z</text>
      <text x="64" y="94" fill={GOLD} opacity="0.15" fontSize="6" fontWeight="bold">z</text>
    </Wrapper>
  );
}

export function EmptyExpensesIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Background */}
      <ellipse cx="100" cy="110" rx="78" ry="55" fill={GOLD} opacity="0.04" />
      {/* Receipt body */}
      <path d="M55 25h90v130l-10-7-10 7-10-7-10 7-10-7-10 7-10-7-10 7V25z" fill="white" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" />
      {/* Receipt header */}
      <rect x="55" y="25" width="90" height="22" fill={BLUE} opacity="0.06" />
      <line x1="75" y1="36" x2="125" y2="36" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.25" />
      {/* Dollar circle */}
      <circle cx="100" cy="75" r="18" fill={GOLD} opacity="0.1" stroke={GOLD} strokeWidth="1.5" />
      <text x="100" y="81" textAnchor="middle" fill={GOLD} fontSize="18" fontWeight="bold">$</text>
      {/* Receipt lines */}
      <line x1="70" y1="105" x2="130" y2="105" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" opacity="0.15" />
      <line x1="75" y1="117" x2="125" y2="117" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" opacity="0.12" />
      {/* Dashed total line */}
      <line x1="65" y1="130" x2="135" y2="130" stroke={BLUE} strokeWidth="1" strokeDasharray="4 3" opacity="0.15" />
      <line x1="85" y1="140" x2="135" y2="140" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      {/* Person looking at receipt */}
      <circle cx="30" cy="82" r="13" fill={SKIN} />
      <ellipse cx="30" cy="73" rx="11" ry="10" fill={HAIR} />
      <rect x="18" y="93" width="24" height="28" rx="6" fill={BLUE} />
      <path d="M42 100l14 4" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <rect x="21" y="121" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="30" y="121" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      {/* Coins */}
      <ellipse cx="165" cy="138" rx="12" ry="4" fill={GOLD} opacity="0.2" />
      <ellipse cx="165" cy="134" rx="12" ry="4" fill={GOLD} opacity="0.25" />
      <ellipse cx="165" cy="130" rx="12" ry="4" fill={GOLD} opacity="0.3" stroke={GOLD} strokeWidth="1" />
    </Wrapper>
  );
}

export function EmptyDevicesIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Background */}
      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />
      {/* Laptop screen */}
      <rect x="30" y="40" width="120" height="80" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      {/* Screen bezel */}
      <rect x="36" y="46" width="108" height="64" rx="3" fill={BLUE} opacity="0.04" />
      {/* Screen content */}
      <rect x="44" y="54" width="40" height="6" rx="2" fill={GOLD} opacity="0.2" />
      <rect x="44" y="66" width="92" height="4" rx="2" fill={BLUE} opacity="0.08" />
      <rect x="44" y="76" width="72" height="4" rx="2" fill={BLUE} opacity="0.06" />
      <rect x="44" y="86" width="56" height="4" rx="2" fill={BLUE} opacity="0.04" />
      {/* Camera dot */}
      <circle cx="90" cy="43" r="1.5" fill={BLUE} opacity="0.2" />
      {/* Laptop base */}
      <path d="M20 120h140l-10 16H30l-10-16z" fill="white" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" />
      <line x1="70" y1="128" x2="110" y2="128" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      {/* Gold power indicator */}
      <circle cx="90" cy="122" r="2" fill={GOLD} opacity="0.4" />
      {/* Person at laptop */}
      <circle cx="164" cy="68" r="12" fill={SKIN} />
      <ellipse cx="164" cy="60" rx="10" ry="9" fill={HAIR} />
      <rect x="154" y="78" width="20" height="24" rx="5" fill={GOLD} />
      <path d="M154 88l-6 10" stroke={SKIN} strokeWidth="4" strokeLinecap="round" />
      <rect x="156" y="102" width="6" height="18" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="164" y="102" width="6" height="18" rx="3" fill={BLUE} opacity="0.7" />
      {/* Sparkle */}
      <path d="M28 52l2-4 2 4-4 0z" fill={GOLD} opacity="0.25" />
    </Wrapper>
  );
}

export function EmptySearchIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Background */}
      <circle cx="95" cy="100" r="78" fill={BLUE} opacity="0.03" />
      {/* Magnifying glass */}
      <circle cx="85" cy="78" r="36" fill="white" stroke={BLUE} strokeWidth="3" />
      <circle cx="85" cy="78" r="28" fill={BLUE} opacity="0.04" />
      {/* Glass handle */}
      <line x1="112" y1="105" x2="140" y2="133" stroke={GOLD} strokeWidth="6" strokeLinecap="round" />
      <line x1="112" y1="105" x2="140" y2="133" stroke={GOLD_LIGHT} strokeWidth="4" strokeLinecap="round" />
      {/* Question mark in glass */}
      <text x="85" y="88" textAnchor="middle" fill={BLUE} fontSize="28" fontWeight="bold" opacity="0.15">?</text>
      {/* Person searching */}
      <circle cx="160" cy="55" r="13" fill={SKIN} />
      <ellipse cx="160" cy="46" rx="11" ry="10" fill={HAIR} />
      <rect x="148" y="66" width="24" height="30" rx="6" fill={BLUE} />
      <path d="M148 76l-14 14" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <rect x="150" y="96" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="161" y="96" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      {/* Floating dots (searching) */}
      <circle cx="40" cy="140" r="4" fill={GOLD} opacity="0.15" />
      <circle cx="55" cy="148" r="2.5" fill={BLUE} opacity="0.1" />
      <circle cx="30" cy="128" r="2" fill={GOLD} opacity="0.1" />
      {/* Small X marks - no results */}
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
      {/* Background */}
      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />
      {/* Timeline line */}
      <line x1="60" y1="30" x2="60" y2="175" stroke={BLUE} strokeWidth="2" opacity="0.12" />
      {/* Node 1 - filled */}
      <circle cx="60" cy="50" r="8" fill={GOLD} opacity="0.2" stroke={GOLD} strokeWidth="1.5" />
      <circle cx="60" cy="50" r="3" fill={GOLD} opacity="0.5" />
      <rect x="78" y="42" width="80" height="16" rx="4" fill={BLUE} opacity="0.06" stroke={BLUE} strokeWidth="1" />
      <line x1="86" y1="50" x2="148" y2="50" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      {/* Node 2 - empty */}
      <circle cx="60" cy="90" r="8" fill="white" stroke={BLUE} strokeWidth="1.5" opacity="0.3" />
      <rect x="78" y="82" width="70" height="16" rx="4" fill={BLUE} opacity="0.04" stroke={BLUE} strokeWidth="1" />
      <line x1="86" y1="90" x2="138" y2="90" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.12" />
      {/* Node 3 - dashed */}
      <circle cx="60" cy="130" r="8" fill="white" stroke={BLUE} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.2" />
      <rect x="78" y="122" width="60" height="16" rx="4" stroke={BLUE} strokeWidth="1" strokeDasharray="4 3" opacity="0.06" />
      {/* Person with clipboard */}
      <circle cx="160" cy="100" r="14" fill={SKIN} />
      <ellipse cx="160" cy="90" rx="12" ry="10" fill={HAIR} />
      <rect x="148" y="112" width="24" height="30" rx="6" fill={GOLD} />
      {/* Clipboard in hand */}
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
      {/* Background */}
      <circle cx="100" cy="105" r="75" fill={GOLD} opacity="0.03" />
      {/* Calendar body */}
      <rect x="28" y="42" width="130" height="115" rx="8" fill="white" stroke={BLUE} strokeWidth="2" />
      {/* Calendar header */}
      <rect x="28" y="42" width="130" height="30" rx="8" fill={BLUE} opacity="0.08" />
      <rect x="28" y="62" width="130" height="10" fill={BLUE} opacity="0.08" />
      {/* Calendar hooks */}
      <line x1="62" y1="32" x2="62" y2="50" stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" opacity="0.4" />
      <line x1="124" y1="32" x2="124" y2="50" stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" opacity="0.4" />
      {/* Month title */}
      <rect x="70" y="48" width="46" height="6" rx="2" fill={BLUE} opacity="0.15" />
      {/* Day header row */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={`dh-${i}`} x={38 + i * 16} y="78" width="8" height="3" rx="1" fill={BLUE} opacity="0.15" />
      ))}
      {/* Date grid */}
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
      {/* Gold highlight on today */}
      <rect x="84" y="90" width="12" height="12" rx="3" stroke={GOLD} strokeWidth="1.5" fill="none" opacity="0.4" />
      {/* Person looking at calendar */}
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
      {/* Background */}
      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />
      {/* Kanban column 1 - To Do */}
      <rect x="14" y="40" width="48" height="100" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="14" y="40" width="48" height="18" rx="6" fill={BLUE} opacity="0.06" />
      <rect x="22" y="46" width="28" height="5" rx="2" fill={BLUE} opacity="0.2" />
      {/* Cards in column 1 */}
      <rect x="20" y="66" width="36" height="18" rx="3" fill={GOLD} opacity="0.1" stroke={GOLD} strokeWidth="1" />
      <rect x="24" y="71" width="20" height="3" rx="1" fill={GOLD} opacity="0.2" />
      <rect x="20" y="90" width="36" height="18" rx="3" stroke={BLUE} strokeWidth="1" strokeDasharray="3 3" opacity="0.12" />
      {/* Kanban column 2 - In Progress */}
      <rect x="70" y="40" width="48" height="100" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="70" y="40" width="48" height="18" rx="6" fill={GOLD} opacity="0.06" />
      <rect x="78" y="46" width="28" height="5" rx="2" fill={GOLD} opacity="0.2" />
      {/* Card in column 2 */}
      <rect x="76" y="66" width="36" height="18" rx="3" fill={BLUE} opacity="0.08" stroke={BLUE} strokeWidth="1" />
      <rect x="80" y="71" width="24" height="3" rx="1" fill={BLUE} opacity="0.15" />
      {/* Kanban column 3 - Done */}
      <rect x="126" y="40" width="48" height="100" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="126" y="40" width="48" height="18" rx="6" fill={BLUE} opacity="0.04" />
      <rect x="134" y="46" width="28" height="5" rx="2" fill={BLUE} opacity="0.12" />
      {/* Flow arrows */}
      <path d="M64 76h4" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M120 76h4" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      {/* Person moving card */}
      <circle cx="94" cy="155" r="12" fill={SKIN} />
      <ellipse cx="94" cy="147" rx="10" ry="9" fill={HAIR} />
      <rect x="84" y="165" width="20" height="18" rx="5" fill={BLUE} />
      {/* Hand reaching up */}
      <path d="M104 170l16-26" stroke={SKIN} strokeWidth="4.5" strokeLinecap="round" />
      {/* Sparkle near done column */}
      <circle cx="150" cy="32" r="3" fill={GOLD} opacity="0.25" />
      <path d="M158 28l2-4 2 4-2 4z" fill={GOLD} opacity="0.2" />
    </Wrapper>
  );
}

export function EmptyMailIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Background */}
      <circle cx="100" cy="100" r="78" fill={GOLD} opacity="0.03" />
      {/* Envelope */}
      <rect x="30" y="60" width="140" height="90" rx="8" fill="white" stroke={BLUE} strokeWidth="2" />
      <path d="M30 68l70 42 70-42" stroke={BLUE} strokeWidth="2" fill="none" strokeLinejoin="round" />
      <rect x="30" y="60" width="140" height="16" rx="8" fill={BLUE} opacity="0.06" />
      {/* Envelope flap */}
      <path d="M30 60l70 38 70-38" stroke={BLUE} strokeWidth="2" fill="white" strokeLinejoin="round" />
      {/* Gold seal */}
      <circle cx="100" cy="125" r="12" fill={GOLD} opacity="0.15" stroke={GOLD} strokeWidth="1.5" />
      <path d="M95 125l3 3 7-7" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Person waving */}
      <circle cx="160" cy="38" r="13" fill={SKIN} />
      <ellipse cx="160" cy="29" rx="11" ry="10" fill={HAIR} />
      <rect x="148" y="49" width="24" height="28" rx="6" fill={GOLD} />
      {/* Waving arm */}
      <path d="M172 55l12-12" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <circle cx="184" cy="43" r="4" fill={SKIN} />
      <rect x="150" y="77" width="7" height="20" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="161" y="77" width="7" height="20" rx="3" fill={BLUE} opacity="0.7" />
      {/* Sparkles */}
      <circle cx="45" cy="45" r="3" fill={GOLD} opacity="0.2" />
      <path d="M55 38l2-4 2 4-2 4z" fill={BLUE} opacity="0.15" />
      <circle cx="135" cy="35" r="2" fill={GOLD} opacity="0.15" />
    </Wrapper>
  );
}

export function EmptyPersonIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Background */}
      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />
      {/* Large question mark silhouette */}
      <circle cx="100" cy="72" r="30" fill={BLUE} opacity="0.05" stroke={BLUE} strokeWidth="2" strokeDasharray="6 4" />
      <text x="100" y="82" textAnchor="middle" fill={BLUE} fontSize="32" fontWeight="bold" opacity="0.1">?</text>
      {/* Silhouette body */}
      <path d="M65 140a35 35 0 0170 0" fill={BLUE} opacity="0.05" stroke={BLUE} strokeWidth="2" strokeDasharray="6 4" />
      {/* Person looking/searching */}
      <circle cx="44" cy="88" r="13" fill={SKIN} />
      <ellipse cx="44" cy="79" rx="11" ry="10" fill={HAIR} />
      <rect x="32" y="99" width="24" height="28" rx="6" fill={GOLD} />
      {/* Hand shielding eyes (looking) */}
      <path d="M56 105l14-6" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <rect x="34" y="127" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="45" y="127" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      {/* Magnifying glass near silhouette */}
      <circle cx="150" cy="108" r="16" fill="white" stroke={GOLD} strokeWidth="2" />
      <line x1="161" y1="119" x2="174" y2="132" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" />
      {/* Sparkles */}
      <circle cx="168" cy="60" r="3" fill={GOLD} opacity="0.2" />
      <path d="M175 72l2-3 2 3-2 3z" fill={BLUE} opacity="0.15" />
    </Wrapper>
  );
}

export function EmptyLeaveIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Background */}
      <circle cx="100" cy="100" r="78" fill={GOLD} opacity="0.03" />
      {/* Calendar */}
      <rect x="40" y="45" width="110" height="100" rx="8" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="40" y="45" width="110" height="28" rx="8" fill={BLUE} opacity="0.06" />
      <rect x="40" y="65" width="110" height="8" fill={BLUE} opacity="0.06" />
      {/* Calendar hooks */}
      <line x1="70" y1="36" x2="70" y2="52" stroke={BLUE} strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <line x1="120" y1="36" x2="120" y2="52" stroke={BLUE} strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      {/* Month text placeholder */}
      <rect x="75" y="52" width="40" height="5" rx="2" fill={BLUE} opacity="0.15" />
      {/* Empty date cells */}
      {[0, 1, 2, 3, 4].map((col) => (
        <rect key={`r1-${col}`} x={50 + col * 18} y={82} width="12" height="12" rx="3" fill={BLUE} opacity="0.04" />
      ))}
      {[0, 1, 2, 3, 4].map((col) => (
        <rect key={`r2-${col}`} x={50 + col * 18} y={102} width="12" height="12" rx="3" fill={BLUE} opacity="0.04" />
      ))}
      {/* Sun icon - vacation */}
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
      {/* Person relaxing */}
      <circle cx="160" cy="105" r="12" fill={SKIN} />
      <ellipse cx="160" cy="96" rx="10" ry="9" fill={HAIR} />
      <rect x="150" y="115" width="20" height="24" rx="5" fill={GOLD} />
      <rect x="152" y="139" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />
      <rect x="162" y="139" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />
    </Wrapper>
  );
}
