import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, invoiceItems } from "@/lib/db/schema/crm";
import { indianStates } from "@/lib/db/schema/accounting";
import type {
  Gstr1PlaceBucket,
  Gstr1RateBucket,
  Gstr1Report,
  Gstr1Section,
  Gstr1Section1,
} from "@/types/accounting";

interface InvoiceRow {
  id: number;
  status: string;
  placeOfSupply: string | null;
  customerGstin: string | null;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
}

interface ItemRow {
  invoiceId: number;
  gstRate: string;
  amount: string;
}

interface BucketAccumulator {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  invoiceIds: Set<number>;
}

interface PlaceAccumulator {
  placeOfSupply: string | null;
  rates: Map<string, BucketAccumulator>;
}

interface SectionAccumulator {
  section: Gstr1Section;
  places: Map<string, PlaceAccumulator>;
  invoiceIds: Set<number>;
}

const INCLUDED_STATUSES: ReadonlyArray<"SENT" | "PAID" | "OVERDUE"> = ["SENT", "PAID", "OVERDUE"];

function normalizeRate(rate: string): string {
  const n = Number(rate);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function placeKey(code: string | null): string {
  return code ?? "__UNKNOWN__";
}

function getOrCreateSection(
  map: Map<Gstr1Section, SectionAccumulator>,
  section: Gstr1Section,
): SectionAccumulator {
  const existing = map.get(section);
  if (existing) return existing;
  const fresh: SectionAccumulator = {
    section,
    places: new Map(),
    invoiceIds: new Set(),
  };
  map.set(section, fresh);
  return fresh;
}

function getOrCreatePlace(
  section: SectionAccumulator,
  placeOfSupply: string | null,
): PlaceAccumulator {
  const key = placeKey(placeOfSupply);
  const existing = section.places.get(key);
  if (existing) return existing;
  const fresh: PlaceAccumulator = { placeOfSupply, rates: new Map() };
  section.places.set(key, fresh);
  return fresh;
}

function getOrCreateBucket(place: PlaceAccumulator, rate: string): BucketAccumulator {
  const existing = place.rates.get(rate);
  if (existing) return existing;
  const fresh: BucketAccumulator = {
    taxableValue: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    invoiceIds: new Set(),
  };
  place.rates.set(rate, fresh);
  return fresh;
}

function classifyInvoice(row: InvoiceRow): Gstr1Section {
  const gstin = row.customerGstin?.trim() ?? "";
  return gstin.length > 0 ? "B2B" : "B2C";
}

function buildRateBuckets(rates: Map<string, BucketAccumulator>): Gstr1RateBucket[] {
  const result: Gstr1RateBucket[] = [];
  for (const [rate, bucket] of rates) {
    result.push({
      gstRate: rate,
      taxableValue: bucket.taxableValue.toFixed(2),
      cgst: bucket.cgst.toFixed(2),
      sgst: bucket.sgst.toFixed(2),
      igst: bucket.igst.toFixed(2),
      invoiceCount: bucket.invoiceIds.size,
    });
  }
  result.sort((a, b) => Number(a.gstRate) - Number(b.gstRate));
  return result;
}

function buildPlaceBuckets(
  section: SectionAccumulator,
  stateNameByCode: Map<string, string>,
): Gstr1PlaceBucket[] {
  const places: Gstr1PlaceBucket[] = [];
  for (const place of section.places.values()) {
    const placeName = place.placeOfSupply ? stateNameByCode.get(place.placeOfSupply) ?? null : null;
    places.push({
      placeOfSupply: place.placeOfSupply,
      placeName,
      rates: buildRateBuckets(place.rates),
    });
  }
  places.sort((a, b) => {
    const left = a.placeOfSupply ?? "";
    const right = b.placeOfSupply ?? "";
    return left.localeCompare(right);
  });
  return places;
}

function summarizeSection(
  section: SectionAccumulator,
  stateNameByCode: Map<string, string>,
): Gstr1Section1 {
  const places = buildPlaceBuckets(section, stateNameByCode);
  let totalTaxableValue = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  for (const place of section.places.values()) {
    for (const bucket of place.rates.values()) {
      totalTaxableValue += bucket.taxableValue;
      totalCgst += bucket.cgst;
      totalSgst += bucket.sgst;
      totalIgst += bucket.igst;
    }
  }
  return {
    section: section.section,
    places,
    totalTaxableValue: totalTaxableValue.toFixed(2),
    totalCgst: totalCgst.toFixed(2),
    totalSgst: totalSgst.toFixed(2),
    totalIgst: totalIgst.toFixed(2),
    totalInvoices: section.invoiceIds.size,
  };
}

function emptySection(section: Gstr1Section): Gstr1Section1 {
  return {
    section,
    places: [],
    totalTaxableValue: "0.00",
    totalCgst: "0.00",
    totalSgst: "0.00",
    totalIgst: "0.00",
    totalInvoices: 0,
  };
}

function allocateInvoice(
  invoice: InvoiceRow,
  lines: ReadonlyArray<ItemRow>,
  sections: Map<Gstr1Section, SectionAccumulator>,
): void {
  const section = getOrCreateSection(sections, classifyInvoice(invoice));
  section.invoiceIds.add(invoice.id);
  const place = getOrCreatePlace(section, invoice.placeOfSupply);

  const invoiceCgst = Number(invoice.cgstAmount);
  const invoiceSgst = Number(invoice.sgstAmount);
  const invoiceIgst = Number(invoice.igstAmount);

  const taxableTotal = lines.reduce((acc, l) => acc + Number(l.amount), 0);
  const weightedTaxTotal = lines.reduce((acc, l) => {
    const taxable = Number(l.amount);
    const rate = Number(l.gstRate);
    return acc + (taxable * rate) / 100;
  }, 0);

  for (const line of lines) {
    const lineTaxable = Number(line.amount);
    const lineRate = Number(line.gstRate);
    const rateKey = normalizeRate(line.gstRate);
    const bucket = getOrCreateBucket(place, rateKey);

    let cgstShare = 0;
    let sgstShare = 0;
    let igstShare = 0;
    if (weightedTaxTotal > 0 && lineRate > 0) {
      const lineWeight = (lineTaxable * lineRate) / 100;
      const ratio = lineWeight / weightedTaxTotal;
      cgstShare = invoiceCgst * ratio;
      sgstShare = invoiceSgst * ratio;
      igstShare = invoiceIgst * ratio;
    } else if (lineRate === 0 && taxableTotal === 0) {
      cgstShare = 0;
      sgstShare = 0;
      igstShare = 0;
    }

    bucket.taxableValue += lineTaxable;
    bucket.cgst += cgstShare;
    bucket.sgst += sgstShare;
    bucket.igst += igstShare;
    bucket.invoiceIds.add(invoice.id);
  }
}

async function loadStateNameMap(): Promise<Map<string, string>> {
  const rows = await db
    .select({ code: indianStates.stateCode, name: indianStates.stateName })
    .from(indianStates);
  const map = new Map<string, string>();
  for (const row of rows) map.set(row.code, row.name);
  return map;
}

export async function buildGstr1Report(
  orgId: string,
  from: string,
  to: string,
): Promise<Gstr1Report> {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);

  const invoiceRows = await db
    .select({
      id: invoices.id,
      status: invoices.status,
      placeOfSupply: invoices.placeOfSupply,
      customerGstin: invoices.customerGstin,
      cgstAmount: invoices.cgstAmount,
      sgstAmount: invoices.sgstAmount,
      igstAmount: invoices.igstAmount,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.orgId, orgId),
        inArray(invoices.status, INCLUDED_STATUSES),
        gte(invoices.createdAt, fromDate),
        lte(invoices.createdAt, toDate),
      ),
    );

  const sections = new Map<Gstr1Section, SectionAccumulator>();
  const grand = { taxable: 0, cgst: 0, sgst: 0, igst: 0, invoiceIds: new Set<number>() };

  if (invoiceRows.length > 0) {
    const invoiceIds = invoiceRows.map((r) => r.id);
    const itemRows = await db
      .select({
        invoiceId: invoiceItems.invoiceId,
        gstRate: invoiceItems.gstRate,
        amount: invoiceItems.amount,
      })
      .from(invoiceItems)
      .where(inArray(invoiceItems.invoiceId, invoiceIds));

    const linesByInvoice = new Map<number, ItemRow[]>();
    for (const row of itemRows) {
      const list = linesByInvoice.get(row.invoiceId) ?? [];
      list.push(row);
      linesByInvoice.set(row.invoiceId, list);
    }

    for (const invoice of invoiceRows) {
      const lines = linesByInvoice.get(invoice.id) ?? [];
      if (lines.length === 0) continue;
      allocateInvoice(invoice, lines, sections);
      grand.invoiceIds.add(invoice.id);
      grand.cgst += Number(invoice.cgstAmount);
      grand.sgst += Number(invoice.sgstAmount);
      grand.igst += Number(invoice.igstAmount);
      for (const line of lines) grand.taxable += Number(line.amount);
    }
  }

  const stateNameByCode = await loadStateNameMap();
  const b2bAccum = sections.get("B2B");
  const b2cAccum = sections.get("B2C");

  return {
    from,
    to,
    b2b: b2bAccum ? summarizeSection(b2bAccum, stateNameByCode) : emptySection("B2B"),
    b2c: b2cAccum ? summarizeSection(b2cAccum, stateNameByCode) : emptySection("B2C"),
    grandTotal: {
      taxableValue: grand.taxable.toFixed(2),
      cgst: grand.cgst.toFixed(2),
      sgst: grand.sgst.toFixed(2),
      igst: grand.igst.toFixed(2),
      invoices: grand.invoiceIds.size,
    },
  };
}
