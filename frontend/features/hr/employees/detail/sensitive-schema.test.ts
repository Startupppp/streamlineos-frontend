import { sensitiveSchema, sensitiveToForm } from "./sensitive-schema";

const MASKED_RECORD = {
  panNumber: "****234F",
  passportNumber: "****4567",
  bankDetails: { accountNumber: "****9012", bankName: "Synthetic Bank", ifsc: "SYNT0000001" },
};

describe("sensitiveSchema", () => {
  it("HO-09 accepts the masked value returned by the server", () => {
    const values = sensitiveToForm(MASKED_RECORD as never);

    expect(sensitiveSchema.safeParse(values).success).toBe(true);
  });

  it("HO-09 still rejects an invalid PAN", () => {
    const values = { ...sensitiveToForm(MASKED_RECORD as never), panNumber: "ABC123" };
    const masqueradingValues = { ...values, panNumber: "***234F" };

    expect(sensitiveSchema.safeParse(values).success).toBe(false);
    expect(sensitiveSchema.safeParse(masqueradingValues).success).toBe(false);
    expect(sensitiveSchema.safeParse({ ...values, panNumber: "ABCDE1234F", bankAccountNumber: "12ab" }).success).toBe(false);
  });
});
