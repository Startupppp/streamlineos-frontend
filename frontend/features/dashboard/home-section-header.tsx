"use client";

interface HomeSectionHeaderProps {
  title: string;
}

export function HomeSectionHeader({ title }: HomeSectionHeaderProps) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-1">
      {title}
    </p>
  );
}
