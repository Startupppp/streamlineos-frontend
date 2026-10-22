import type { ProductContent } from "@/features/landing/relay/data/product";

import { ChartCard } from "./chart-card";
import { FeatureRow } from "./feature-row";

export const RowChart = ({ chart }: Pick<ProductContent, "chart">) => (
  <FeatureRow
    copyClassName="w-87.75 w1024:w-87 w390:w-87.5"
    index={chart.index}
    title={chart.title}
    body={chart.body}
    visual={<ChartCard chart={chart} />}
    className="h-94 pb-0 w1024:h-88 w1024:pb-0"
  />
);
