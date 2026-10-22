import type { FooterContent } from "@/features/landing/relay/data/footer";

import { BrandPanel } from "./brand-panel";
import { CtaPanel } from "./cta-panel";
import { Glows } from "./glows";
import { LinkArea } from "./link-area";
import { CUE, CueFade, CueLine, FooterStage } from "./stage";
import { StatusRow } from "./status-row";

export const Footer = ({
  brand,
  cta,
  statuses,
  company,
  columns,
  legal,
}: FooterContent) => (
  <footer
    id="footer"
    aria-label="Site footer"
    className="[content-visibility:auto] relative h-191 w1024:h-161.5 w768:h-271 w390:h-309.25"
  >
    <Glows />
    <FooterStage>
      <BrandPanel {...brand} />
      <CtaPanel {...cta} />
      <StatusRow statuses={statuses} />

      <CueLine
        stage="bottom"
        delay={CUE.bottomLine}
        className="absolute top-125.5 left-20 h-px w-320 bg-footer-hairline w1024:top-90.5 w1024:left-12 w1024:w-232 w768:top-171 w768:left-10 w768:w-172 w390:top-192.25 w390:left-5 w390:w-87.5"
      />
      <LinkArea company={company} columns={columns} />
      <CueLine
        stage="bottom"
        delay={CUE.footLine}
        className="absolute top-173.75 left-20 h-px w-320 bg-footer-hairline w1024:top-144.25 w1024:left-12 w1024:w-232 w768:top-253.75 w768:left-10 w768:w-172 w390:top-286 w390:left-5 w390:w-87.5"
      />

      
      <CueFade
        stage="bottom"
        delay={CUE.legal}
        className="absolute top-180 left-20 flex h-6.5 w-320 justify-between font-mono text-relay-label leading-label text-foreground-dim w1024:top-150.5 w1024:left-12 w1024:h-5 w1024:w-232 w768:top-260 w768:left-10 w768:w-172 w390:top-292.25 w390:left-5 w390:h-12 w390:w-87.5 w390:flex-col w390:gap-2"
      >
        <p>{legal.copyright}</p>
        <p className="text-right w390:text-left">{legal.origin}</p>
      </CueFade>
    </FooterStage>
  </footer>
);
