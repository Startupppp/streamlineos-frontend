import { createEnterpriseQuoteSchema } from "./enterprise-quote-schema";

const base = {
  subject: "Acme 3-year",
  requestedSeats: "60",
  negotiatedSeats: "50",
  pricePerSeat: "1499.5",
  contractTermMonths: "36" as const,
  validUntil: "2026-12-31",
  notes: "  ",
};

describe("createEnterpriseQuoteSchema", () => {
  it("sends whole paise, numeric seats and term, and drops blank notes", () => {
    expect(createEnterpriseQuoteSchema.parse(base)).toEqual({
      subject: "Acme 3-year",
      requestedSeats: 60,
      negotiatedSeats: 50,
      pricePerSeatInPaise: 149_950,
      contractTermMonths: 36,
      validUntil: "2026-12-31",
    });
  });

  it("refuses fractional seats, sub-paise prices and a missing date", () => {
    expect(createEnterpriseQuoteSchema.safeParse({ ...base, negotiatedSeats: "1.5" }).success).toBe(false);
    expect(createEnterpriseQuoteSchema.safeParse({ ...base, pricePerSeat: "10.005" }).success).toBe(false);
    expect(createEnterpriseQuoteSchema.safeParse({ ...base, validUntil: "" }).success).toBe(false);
  });
});
