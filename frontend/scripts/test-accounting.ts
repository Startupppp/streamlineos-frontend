import { config } from "dotenv";
config({ path: ".env" });

import { splitTaxPool, computeLineAmount, computeLineTax } from "@/lib/accounting/posting-rules";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  } else {
    console.log("PASS:", message);
  }
}

function main(): void {
  const intra = splitTaxPool(180, { supplierStateCode: "27", placeOfSupplyStateCode: "27" });
  assert(intra.cgst === 90 && intra.sgst === 90 && intra.igst === 0, "intra-state splits CGST+SGST equally");

  const inter = splitTaxPool(180, { supplierStateCode: "27", placeOfSupplyStateCode: "29" });
  assert(inter.igst === 180 && inter.cgst === 0 && inter.sgst === 0, "inter-state goes to IGST");

  const odd = splitTaxPool(0.03, { supplierStateCode: "27", placeOfSupplyStateCode: "27" });
  assert(Math.abs(odd.cgst + odd.sgst - 0.03) < 0.0001, "odd-paisa split sums back to total");

  const line = { quantity: 3, rate: 100, gstRate: 18 };
  assert(computeLineAmount(line) === 300, "line amount 3*100=300");
  assert(computeLineTax(line) === 54, "line tax at 18% = 54");

  console.log("Posting-rules smoke checks passed.");
  process.exit(0);
}

main();
