import { z } from "zod";

export const createDepartmentInputSchema = z.object({
  name: z.string().min(1, "Department name is required"),
});

export const updateProfileInputSchema = z.object({
  userId: z.string().min(1),
  designation: z.string().optional(),
  departmentId: z.number().int().positive().optional(),
  phone: z.string().optional(),
});

export const generatePayrollInputSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
});

export const createSalaryStructureInputSchema = z.object({
  userId: z.string().min(1),
  basicSalary: z.number().positive(),
  hraPercentage: z.number().min(0).max(100),
  allowances: z.number().min(0),
  deductions: z.number().min(0),
  effectiveFrom: z.date(),
  effectiveTo: z.date().optional(),
});

export const createExpenseInputSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.number().positive(),
  description: z.string().optional(),
  receiptUrl: z.string().url().optional(),
  expenseDate: z.date(),
});

export const updateExpenseStatusInputSchema = z.object({
  expenseId: z.number().int().positive(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "PAID"]),
  rejectionReason: z.string().optional(),
});

export const createAssetInputSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  type: z.string().min(1, "Asset type is required"),
  serialNumber: z.string().optional(),
  assignedTo: z.string().optional(),
  purchaseDate: z.date().optional(),
  purchaseCost: z.number().positive().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const updateAssetInputSchema = z.object({
  assetId: z.number().int().positive(),
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  serialNumber: z.string().optional(),
  assignedTo: z.string().optional().nullable(),
  status: z.enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"]).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const createDocumentInputSchema = z.object({
  userId: z.string().optional(),
  name: z.string().min(1, "Document name is required"),
  type: z.enum(["CONTRACT", "CERTIFICATE", "ID_PROOF", "PAYSLIP", "POLICY", "OFFER_LETTER", "RESUME", "OTHER"]),
  fileUrl: z.string().url(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
});

export const createPerformanceReviewInputSchema = z.object({
  userId: z.string().min(1),
  reviewerId: z.string().optional(),
  periodStart: z.date(),
  periodEnd: z.date(),
  ratings: z
    .array(
      z.object({
        category: z.string(),
        score: z.number().min(0).max(10),
        comment: z.string().optional(),
      })
    )
    .optional(),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  goals: z
    .array(
      z.object({
        goal: z.string(),
        achieved: z.boolean(),
      })
    )
    .optional(),
  overallRating: z.number().min(0).max(10).optional(),
  comments: z.string().optional(),
});

export const createGoalInputSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1, "Goal title is required"),
  description: z.string().optional(),
  type: z.string().default("OKR"),
  targetValue: z.number().positive().optional(),
  currentValue: z.number().min(0).default(0),
  unit: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  parentGoalId: z.number().int().positive().optional(),
});

export const updateGoalInputSchema = z.object({
  goalId: z.number().int().positive(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  targetValue: z.number().positive().optional(),
  currentValue: z.number().min(0).optional(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  progress: z.number().min(0).max(100).optional(),
});

export const upsertWorkLogInputSchema = z.object({
  date: z.date(),
  description: z.string().min(1, "Log content is required"),
  hours: z.number().min(0).optional(),
});

export const getWorkLogsInputSchema = z.object({
  year: z.number().int().positive(),
  quarter: z.number().int().min(1).max(4),
  userId: z.string().optional(),
});

export const onboardEmployeeInputSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  whatsappSameAsPhone: z.boolean().default(true),
  whatsappNumber: z.string().optional(),
  password: z.string().refine((val) => !val || val.length >= 8, {
    message: "Password must be at least 8 characters",
  }).optional(),
  designation: z.string().min(1, "Designation is required"),
  departmentId: z.coerce.number().int().refine((val) => val !== 0 && !isNaN(val), {
    message: "Department is required",
  }),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).default("MEMBER"),
  joiningDate: z.date(),
  dateOfBirth: z.date(),
  experienceYears: z.coerce.number().min(0).optional(),
  skills: z.string().optional(),
  taxId: z.string().optional(),
  monthlySalary: z.coerce.number().min(0).optional(),
  bankDetails: z.object({
    accountNumber: z.string().min(1, "Account number is required"),
    bankName: z.string().min(1, "Bank name is required"),
    branch: z.string().min(1, "Branch name is required"),
    ifsc: z.string().min(1, "IFSC code is required"),
    accountHolder: z.string().min(1, "Account holder name is required"),
  }),
});

export const createWfhRequestInputSchema = z.object({
  date: z.date(),
  reason: z.string().optional(),
  approverId: z.string().min(1, "Approver is required"),
});

export const processWfhRequestInputSchema = z.object({
  requestId: z.number().int().positive(),
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().optional(),
});

export const createDeviceInputSchema = z.object({
  userId: z.string().min(1, "User is required"),
  deviceType: z.string().min(1, "Device type is required"),
  deviceName: z.string().min(1, "Device name is required"),
  serialNumber: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  assignedDate: z.date().optional(),
  notes: z.string().optional(),
});

export const updateDeviceInputSchema = z.object({
  deviceId: z.number().int().positive(),
  deviceType: z.string().optional(),
  deviceName: z.string().optional(),
  serialNumber: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "LOST", "RETURNED"]).optional(),
  returnDate: z.date().optional(),
  notes: z.string().optional(),
});

export const generateEmployeePayslipInputSchema = z.object({
  userId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  lopDays: z.number().int().min(0).max(30).optional().default(0),
  halfDays: z.number().int().min(0).max(30).optional().default(0),
  otherDeductions: z.number().min(0).optional().default(0),
  bonus: z.number().min(0).optional().default(0),
});