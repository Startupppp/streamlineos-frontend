export const DS = {
  card: "rounded-xl border border-border bg-card shadow-noir",
  cardElevated:
    "rounded-2xl border border-border bg-card shadow-[0_18px_44px_-18px_rgba(30,64,175,0.18)]",
  cardSoft: "rounded-xl border border-border bg-card/70 backdrop-blur-sm",

  heading1:
    "font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-foreground",
  heading2:
    "font-display text-2xl lg:text-3xl font-extrabold tracking-[-0.02em] text-foreground",
  heading3: "font-display text-xl font-bold text-foreground",
  heading4: "text-base font-semibold tracking-tight text-foreground",

  textBody: "text-sm text-foreground/90 leading-relaxed",
  textMuted: "text-sm text-muted-foreground",
  textSmall: "text-[13px] text-muted-foreground",
  textXs: "text-xs text-muted-foreground",

  eyebrow: "text-[11px] font-medium text-muted-foreground",
  monoMeta: "text-[11px] font-medium text-muted-foreground",

  brandText: "text-blue-600",
  brandGradient: "bg-gradient-to-br from-blue-500 to-cyan-500",
  brandRing:
    "ring-1 ring-blue-200 focus-visible:ring-2 focus-visible:ring-blue-300",

  pageSection: "px-4 sm:px-6 pt-3 pb-6",
  pageHeader: "px-4 sm:px-6 pt-4 pb-2",
  stackTight: "space-y-1.5",
  stackBase: "space-y-3",
  stackLoose: "space-y-4",

  control: "h-9 text-sm",
  controlSm: "h-8 text-[13px]",
  controlLg: "h-11 text-sm",

  containerNarrow: "w-full max-w-3xl mx-auto px-4 sm:px-6",
  containerWide: "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  gridResponsive2: "grid grid-cols-1 sm:grid-cols-2 gap-3",
  gridResponsive3: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",
  gridResponsive4: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3",
  tableResponsive: "w-full -mx-4 sm:mx-0 px-4 sm:px-0",
  flexResponsive: "flex flex-col sm:flex-row sm:items-center gap-3",
} as const;
