import { DrawLine } from "@/features/landing/relay/components/ui/draw-line";
import { SectionHead } from "@/features/landing/relay/components/ui/section-head";
import type { ProductContent } from "@/features/landing/relay/data/product";

import { RowApproval } from "./row-approval";
import { RowChart } from "./row-chart";
import { RowTrace } from "./row-trace";

const Hairline = ({ className = "" }: { className?: string }) => (
  <DrawLine className={`h-px shrink-0 bg-product-hairline ${className}`} />
);

export const Product = ({ head, trace, approval, chart }: ProductContent) => (
  <section
    id="product"
    aria-label="Product"
    className="[content-visibility:auto] relative flex h-398.25 flex-col px-page-inset pt-24 w1024:h-373.25 w1024:pt-20 w768:h-500 w768:pt-11 w768:gap-4 w390:h-403.5 w390:gap-8 w390:pt-12"
  >
    <SectionHead
      stackClassName="w768:gap-4"
      asideClassName="w1024:w-120! w768:w-130! w390:w-full!"
      badge={head.badge}
      title={head.title}
      aside={head.aside}
      className="pb-16 w1024:pb-8 w768:pb-4 w390:pb-0"
    />
    <Hairline />
    <RowTrace trace={trace} />
    
    <Hairline className="w390:hidden" />
    <RowApproval approval={approval} />
    <Hairline className="w390:hidden" />
    <RowChart chart={chart} />
  </section>
);
