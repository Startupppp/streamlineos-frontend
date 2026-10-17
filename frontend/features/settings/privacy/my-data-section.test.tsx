import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GdprExportJob } from "@/hooks/api/privacy/gdpr-schema";
import { MyDataSection } from "./my-data-section";
import { EMPTY_ADDRESS, EMPTY_EMERGENCY_CONTACT, rectificationSchema, toRectificationBody } from "./rectification-schema";

const exportNow = jest.fn();
const createJob = jest.fn();
let job: GdprExportJob | undefined;
jest.mock("@/hooks/api/privacy/gdpr", () => ({
  ...jest.requireActual("@/hooks/api/privacy/gdpr"),
  useExportMyData: () => ({ mutate: exportNow, isPending: false }),
  useCreateMyExportJob: () => ({ mutate: createJob, isPending: false }),
  useGdprExportJob: () => ({ data: job, isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useDownloadGdprExport: () => ({ mutate: jest.fn(), isPending: false }),
  useRectifyMyProfile: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));

const JOB: GdprExportJob = {
  id: "11111111-1111-4111-8111-111111111111",
  status: "completed",
  subjectUserId: "u-1",
  rowCount: 10,
  truncated: false,
  fileName: "export.json",
  errorCode: null,
  errorMessage: null,
  createdAt: "2026-10-01T10:00:00Z",
  completedAt: "2026-10-01T10:05:00Z",
  expiresAt: "2026-10-08T10:05:00Z",
};

beforeEach(() => {
  window.localStorage.clear();
  job = undefined;
  createJob.mockReset();
});

it("remembers a started archive and offers its download once ready", async () => {
  createJob.mockImplementation((_: unknown, opts: { onSuccess: (j: GdprExportJob) => void }) => opts.onSuccess(JOB));
  job = JOB;
  render(<MyDataSection />);
  expect(screen.queryByText("Data archive")).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Prepare full archive" }));

  expect(screen.getByText("Ready")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
  expect(Object.values({ ...window.localStorage })).toContain(JOB.id);
});

it("offers no download while the worker still has the job", () => {
  window.localStorage.setItem("unscoped::gdpr-export-job", JOB.id);
  job = { ...JOB, status: "running", fileName: null, completedAt: null };
  render(<MyDataSection />);
  expect(screen.getByText("Preparing")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();
});

describe("rectificationSchema", () => {
  it("checks the value against the chosen field", () => {
    expect(rectificationSchema.safeParse({ field: "hr_profile.personal_email", value: "nope" }).success).toBe(false);
    expect(rectificationSchema.safeParse({ field: "hr_profile.personal_email", value: " a@b.co " }).success).toBe(true);
    expect(rectificationSchema.safeParse({ field: "hr_profile.date_of_birth", value: "15-05-1990" }).success).toBe(false);
    expect(rectificationSchema.safeParse({ field: "hr_profile.phone", value: "1".repeat(31) }).success).toBe(false);
    expect(rectificationSchema.safeParse({ field: "profile.name", value: "   " }).success).toBe(false);
  });
});

describe("rectification of address and emergency contact", () => {
  it("sends the whole address object, without the empty parts", () => {
    const parsed = rectificationSchema.parse({
      field: "hr_profile.address",
      value: "",
      address: { ...EMPTY_ADDRESS, line1: " 1 High St ", city: "Leeds", country: "UK" },
      emergencyContact: EMPTY_EMERGENCY_CONTACT,
    });
    expect(toRectificationBody(parsed)).toEqual({
      field: "hr_profile.address",
      value: { line1: "1 High St", city: "Leeds", country: "UK" },
    });
  });

  it("sends the emergency contact and checks its email", () => {
    const base = { field: "hr_profile.emergency_contact", value: "", address: EMPTY_ADDRESS } as const;
    expect(
      rectificationSchema.safeParse({ ...base, emergencyContact: { ...EMPTY_EMERGENCY_CONTACT, email: "nope" } }).success,
    ).toBe(false);
    const parsed = rectificationSchema.parse({
      ...base,
      emergencyContact: { ...EMPTY_EMERGENCY_CONTACT, name: "Sam", phone: "+44 1" },
    });
    expect(toRectificationBody(parsed)).toEqual({
      field: "hr_profile.emergency_contact",
      value: { name: "Sam", phone: "+44 1" },
    });
  });

  it("refuses an entirely empty address", () => {
    expect(
      rectificationSchema.safeParse({ field: "hr_profile.address", value: "", address: EMPTY_ADDRESS }).success,
    ).toBe(false);
  });
});
