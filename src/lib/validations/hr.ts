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
  hraPercentage: z.number().min(0).max(100).default(40),
  allowances: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
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
  type: z.enum(["CONTRACT", "CERTIFICATE", "ID", "PAYSLIP", "OTHER"]),
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