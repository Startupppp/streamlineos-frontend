import type { ProductContent } from "@/features/landing/relay/data/product";

import { FeatureRow } from "./feature-row";
import { TraceCard } from "./trace-card";

export const RowTrace = ({ trace }: Pick<ProductContent, "trace">) => (
  <FeatureRow
    copyClassName="w-88 w1024:w-85.75 w768:w-88.5 w390:w-87.5"
    index={trace.index}
    title={trace.title}
    body={trace.body}
    visual={<TraceCard trace={trace} />}
    className="h-106 w1024:h-97"
  />
);
