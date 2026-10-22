import { Badge } from "@/features/landing/relay/components/ui/badge";
import { DisplayTitle, type TitleParts } from "@/features/landing/relay/components/ui/display-title";
import { FocusText } from "@/features/landing/relay/components/ui/focus-text";
import { Reveal } from "@/features/landing/relay/components/ui/reveal";
import { REVEAL } from "@/features/landing/relay/lib/motion";

export interface SectionHeadProps {
  badge: string;
  title: TitleParts;
  aside: string;
  className?: string;
  asideClassName?: string;
  stackClassName?: string;
}

export const SectionHead = ({
  badge,
  title,
  aside,
  className = "",
  asideClassName = "",
  stackClassName = "",
}: SectionHeadProps) => (
  <header
    className={`flex items-end gap-12 w1024:flex-col w1024:items-center w1024:gap-4 ${className}`}
  >
    <Reveal
      className={`flex w-190 flex-col items-start gap-4 w1024:w-full w1024:items-center w1024:gap-6 w390:gap-3 ${stackClassName}`}
    >
      <Badge label={badge} />
      <DisplayTitle
        {...title}
        className="text-section-title leading-section-title w1024:text-center"
        delay={REVEAL.step}
        accentClassName="text-section-title-accent"
      />
    </Reveal>
    <FocusText
      delay={2 * REVEAL.step}
      className={`w-110 text-body leading-body text-foreground-muted w1024:w-140 w1024:text-center w390:w-full ${asideClassName}`}
    >
      {aside}
    </FocusText>
  </header>
);
