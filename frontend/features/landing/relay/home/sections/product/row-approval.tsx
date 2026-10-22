import type { ProductContent } from "@/features/landing/relay/data/product";

import { ApprovalCard } from "./approval-card";
import { FeatureRow } from "./feature-row";

export const RowApproval = ({ approval }: Pick<ProductContent, "approval">) => (
  <FeatureRow
    flip
    index={approval.index}
    title={approval.title}
    body={approval.body}
    copyClassName="w768:w-101.5 w390:w-auto"
    visual={<ApprovalCard approval={approval} />}
    className="h-106 w1024:h-96"
    titleClassName="w1024:w-68 w768:w-auto"
  />
);
