import { TypeText } from "@/features/landing/relay/components/ui/type-text";
import type { IntegrationsContent } from "@/features/landing/relay/data/integrations";

import { IntegrationsRelay } from "./relay";

export const Integrations = ({
  caption,
  captionLines390,
  apps,
}: IntegrationsContent) => (
  <section
    id="integrations"
    aria-label="Integrations"
    className="[content-visibility:auto] relative h-88.5 w1024:h-53 w768:h-57 w390:h-54 overflow-clip"
  >
    <p className="absolute top-24 left-20 w1024:top-8 w1024:left-12 w768:top-10 w768:left-10 w390:hidden font-mono text-relay-label leading-label whitespace-nowrap text-foreground-muted">
      <TypeText>{caption}</TypeText>
    </p>
    
    <p className="absolute top-8 left-16.25 hidden w-65.25 w390:flex flex-col items-center font-mono text-relay-label leading-label whitespace-nowrap text-foreground-muted">
      <TypeText>{captionLines390[0]}</TypeText>
      <TypeText delay={captionLines390[0].length * 30}>
        {captionLines390[1]}
      </TypeText>
    </p>

    <IntegrationsRelay apps={apps} />
  </section>
);
