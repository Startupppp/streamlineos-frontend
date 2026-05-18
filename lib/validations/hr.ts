import { format } from "date-fns";
import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import { getVaivammEstablishedDate } from "@/lib/constants/company";
import { bankDetailsSchema } from "@/lib/validations/bank-details";

const PERSON_NAME_MIN_LENGTH = 2;
const PERSON_NAME_MAX_LENGTH = 50;
const EMAIL_MAX_LENGTH = 254;
const MIN_EMPLOYEE_AGE_YEARS = 16;
const MAX_EMPLOYEE_AGE_YEARS = 100;
const EMPLOYEE_ID_MIN_LENGTH = 2;
const EMPLOYEE_ID_MAX_LENGTH = 20;
const EMPLOYEE_ID_PATTERN = /^[A-Za-z0-9]+$/;
const SKILL_ITEM_MIN_LENGTH = 1;
const SKILL_ITEM_MAX_LENGTH = 50;
const SKILLS_LIST_MAX_LENGTH = 500;
const MAX_SKILLS_COUNT = 30;
const SKILL_ITEM_PATTERN = /^[A-Za-z0-9+#.\-\s]+$/;
const EXPERIENCE_MIN_YEARS = 0;
const EXPERIENCE_MAX_YEARS = 50;
const MONTHLY_SALARY_MIN = 1;
const MONTHLY_SALARY_MAX = 100_000_000;

const PERSON_NAME_PATTERN = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

function startOfCalendarDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function personNameSchema(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .min(PERSON_NAME_MIN_LENGTH, `${label} must be at least ${PERSON_NAME_MIN_LENGTH} characters`)
    .max(PERSON_NAME_MAX_LENGTH, `${label} must be at most ${PERSON_NAME_MAX_LENGTH} characters`)
    .regex(
      PERSON_NAME_PATTERN,
      `${label} may only contain letters with single spaces between words`,
    );
}

function requiredPhoneSchema(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((val) => isValidPhoneNumber(val), {
      message:
        "Enter a valid phone number with the correct length for the selected country (e.g. 10-digit mobile for India).",
    })
    .refine((val) => {
      const digits = val.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    }, `${label} must contain 10 to 15 digits`);
}

function optionalPhoneSchema(label: string) {
  return z
    .string()
    .optional()
    .refine((val) => !val?.trim() || isValidPhoneNumber(val), {
      message:
        "Enter a valid phone number with the correct length for the selected country.",
    })
    .refine((val) => {
      if (!val?.trim()) return true;
      const digits = val.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    }, `${label} must contain 10 to 15 digits`);
}

function parseSkillsList(val: string): string[] {
  return val
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function optionalEmployeeIdSchema() {
  return z
    .string()
    .trim()
    .optional()
    .refine(
      (val) =>
        !val ||
        (val.length >= EMPLOYEE_ID_MIN_LENGTH &&
          val.length <= EMPLOYEE_ID_MAX_LENGTH &&
          EMPLOYEE_ID_PATTERN.test(val)),
      `Employee ID must be ${EMPLOYEE_ID_MIN_LENGTH}–${EMPLOYEE_ID_MAX_LENGTH} letters or numbers only`,
    );
}

function optionalSkillsSchema() {
  return z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || val.length <= SKILLS_LIST_MAX_LENGTH, {
      message: `Skills list must be at most ${SKILLS_LIST_MAX_LENGTH} characters`,
    })
    .refine((val) => {
      if (!val) return true;
      const items = parseSkillsList(val);
      if (items.length === 0 || items.length > MAX_SKILLS_COUNT) return false;
      return items.every(
        (item) =>
          item.length >= SKILL_ITEM_MIN_LENGTH &&
          item.length <= SKILL_ITEM_MAX_LENGTH &&
          SKILL_ITEM_PATTERN.test(item),
      );
    }, {
      message: `Enter up to ${MAX_SKILLS_COUNT} skills separated by commas (each ${SKILL_ITEM_MIN_LENGTH}–${SKILL_ITEM_MAX_LENGTH} characters; letters, numbers, spaces, + # . -)`,
    });
}

function optionalExperienceYearsSchema() {
  return z
    .coerce
    .number({ message: "Years of experience must be a number" })
    .min(EXPERIENCE_MIN_YEARS, "Years of experience cannot be negative")
    .max(EXPERIENCE_MAX_YEARS, `Years of experience cannot exceed ${EXPERIENCE_MAX_YEARS} years`)
    .refine(
      (val) => Math.round(val * 10) === val * 10,
      "Use at most one decimal place for years of experience",
    )
    .optional();
}

function editExperienceYearsSchema() {
  return z.preprocess(
    (val) =>
      val === "" || val === null || val === undefined || (typeof val === "number" && Number.isNaN(val))
        ? undefined
        : val,
    z
      .number({ message: "Years of experience must be a number" })
      .min(EXPERIENCE_MIN_YEARS, "Years of experience cannot be negative")
      .max(EXPERIENCE_MAX_YEARS, `Years of experience cannot exceed ${EXPERIENCE_MAX_YEARS} years`)
      .refine(
        (val) => Math.round(val * 10) === val * 10,
        "Use at most one decimal place for years of experience",
      )
      .optional(),
  );
}

function optionalPanSchema() {
  return z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(val.toUpperCase()),
      "Invalid PAN format (e.g. ABCDE1234F)",
    )
    .or(z.literal(""));
}

function optionalMonthlySalaryForEditSchema() {
  return z
    .number({ message: "Monthly salary must be a number" })
    .min(MONTHLY_SALARY_MIN, "Monthly salary must be greater than 0")
    .max(
      MONTHLY_SALARY_MAX,
      `Monthly salary cannot exceed ₹${MONTHLY_SALARY_MAX.toLocaleString("en-IN")}`,
    )
    .refine((val) => Number.isInteger(val), "Monthly salary must be a whole number")
    .optional();
}

function refineJoiningDateOptional(
  joiningDate: Date | undefined,
  ctx: z.RefinementCtx,
  path: (string | number)[] = ["joiningDate"],
) {
  if (!joiningDate) return;

  const established = startOfCalendarDay(getVaivammEstablishedDate());
  const establishedLabel = format(established, "MMMM d, yyyy");
  const joining = startOfCalendarDay(joiningDate);

  if (joining < established) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Joining date cannot be before company establishment (${establishedLabel})`,
      path,
    });
  }
}

type FlatBankFormValues = {
  bankAccount?: string;
  bankName?: string;
  branch?: string;
  ifsc?: string;
  accountHolder?: string;
  swiftCode?: string;
  iban?: string;
};

const FLAT_BANK_FIELD_MAP: Record<string, keyof FlatBankFormValues> = {
  accountNumber: "bankAccount",
  bankName: "bankName",
  branch: "branch",
  ifsc: "ifsc",
  accountHolder: "accountHolder",
  swiftCode: "swiftCode",
  iban: "iban",
};

function refineFlatBankDetails(values: FlatBankFormValues, ctx: z.RefinementCtx) {
  const coreFields = [
    values.bankAccount,
    values.bankName,
    values.branch,
    values.ifsc,
    values.accountHolder,
  ];
  const anyCoreFilled = coreFields.some((field) => !!field?.trim());
  if (!anyCoreFilled) return;

  const missing: Array<{ path: keyof FlatBankFormValues; message: string }> = [];
  if (!values.bankAccount?.trim()) {
    missing.push({ path: "bankAccount", message: "Account number is required" });
  }
  if (!values.bankName?.trim()) {
    missing.push({ path: "bankName", message: "Bank name is required" });
  }
  if (!values.branch?.trim()) {
    missing.push({ path: "branch", message: "Branch name is required" });
  }
  if (!values.ifsc?.trim()) {
    missing.push({ path: "ifsc", message: "IFSC code is required" });
  }
  if (!values.accountHolder?.trim()) {
    missing.push({ path: "accountHolder", message: "Account holder name is required" });
  }

  for (const item of missing) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: item.message,
      path: [item.path],
    });
  }
  if (missing.length > 0) return;

  const parsed = bankDetailsSchema.safeParse({
    accountNumber: values.bankAccount,
    bankName: values.bankName,
    branch: values.branch,
    ifsc: values.ifsc,
    accountHolder: values.accountHolder,
    swiftCode: values.swiftCode,
    iban: values.iban,
  });

  if (parsed.success) return;

  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string") continue;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: issue.message,
      path: [FLAT_BANK_FIELD_MAP[key] ?? key],
    });
  }
}

const requiredDateSchema = (label: string) =>
  z.coerce.date({
    message: `${label} is required`,
  });
const fileUrlSchema = z.string().min(1).refine(
  (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
  { message: "Must be a valid URL or a relative path starting with /" }
);

export const createDepartmentInputSchema = z.object({
  name: z.string().min(1, "Department name is required"),
});

export const updateProfileInputSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).optional(),
  designation: z.string().optional(),
  departmentId: z.number().int().positive().optional(),
  phone: z.string().regex(/^[\d+\s-]+$/, "Please enter a valid phone number").optional().or(z.literal("")),
  image: z.string().optional(),
});

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8)
    .max(128, "Password must be at most 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain uppercase, lowercase, number, and special character"
    ),
});

const monthStringSchema = z.string()
  .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format")
  .refine((val) => {
    const month = parseInt(val.split("-")[1], 10);
    return month >= 1 && month <= 12;
  }, "Month must be between 01 and 12");

export const generatePayrollInputSchema = z.object({
  month: monthStringSchema,
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
  category: z.string().min(1, "Category is required").max(100),
  amount: z.number().positive(),
  description: z.string().max(1000).optional(),
  receiptUrl: fileUrlSchema.optional(),
  expenseDate: z.date(),
});

export const updateExpenseStatusInputSchema = z.object({
  expenseId: z.number().int().positive(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "PAID"]),
  rejectionReason: z.string().max(500).optional(),
});

export const createAssetInputSchema = z.object({
  name: z.string().min(1, "Asset name is required").max(200),
  type: z.string().min(1, "Asset type is required").max(100),
  serialNumber: z.string().max(100).optional(),
  assignedTo: z.string().optional(),
  purchaseDate: z.date().optional(),
  purchaseCost: z.number().positive().optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
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
  fileUrl: fileUrlSchema,
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

export const updateWorkLogStatusSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().max(500).optional(),
});

export const onboardEmployeeInputSchema = z
  .object({
    firstName: personNameSchema("First name"),
    lastName: personNameSchema("Last name"),
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Invalid email address")
      .max(EMAIL_MAX_LENGTH, `Email must be at most ${EMAIL_MAX_LENGTH} characters`),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]),
    phone: requiredPhoneSchema("Phone number"),
    whatsappSameAsPhone: z.boolean().default(true),
    whatsappNumber: optionalPhoneSchema("WhatsApp number"),
    password: z
      .string()
      .max(128, "Password must be at most 128 characters")
      .refine((val) => !val || val.length >= 8, {
        message: "Password must be at least 8 characters",
      })
      .optional(),
    designation: z.string().trim().min(1, "Designation is required"),
    departmentId: z.coerce.number().int().refine((val) => val !== 0 && !isNaN(val), {
      message: "Department is required",
    }),
    role: z.string().default("ENGINEERING"),
    employeeId: optionalEmployeeIdSchema().transform((val) => {
      const trimmed = val?.trim();
      return trimmed ? trimmed : undefined;
    }),
    joiningDate: requiredDateSchema("Joining date"),
    dateOfBirth: requiredDateSchema("Date of birth"),
    experienceYears: optionalExperienceYearsSchema(),
    skills: optionalSkillsSchema(),
    taxId: z
      .string()
      .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN format (e.g. ABCDE1234F)")
      .optional()
      .or(z.literal("")),
    monthlySalary: z.coerce
      .number({ message: "Monthly salary is required" })
      .min(MONTHLY_SALARY_MIN, "Monthly salary must be greater than 0")
      .max(
        MONTHLY_SALARY_MAX,
        `Monthly salary cannot exceed ₹${MONTHLY_SALARY_MAX.toLocaleString("en-IN")}`,
      )
      .refine((val) => Number.isInteger(val), "Monthly salary must be a whole number"),
    bankDetails: bankDetailsSchema,
  })
  .superRefine((data, ctx) => {
    const today = startOfCalendarDay(new Date());
    const established = startOfCalendarDay(getVaivammEstablishedDate());
    const establishedLabel = format(established, "MMMM d, yyyy");

    if (data.joiningDate) {
      const joining = startOfCalendarDay(data.joiningDate);
      if (joining < established) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Joining date cannot be before company establishment (${establishedLabel})`,
          path: ["joiningDate"],
        });
      }
    }

    if (data.dateOfBirth) {
      const dob = startOfCalendarDay(data.dateOfBirth);

      if (dob >= today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date of birth must be in the past",
          path: ["dateOfBirth"],
        });
      }

      const youngestAllowed = new Date(today);
      youngestAllowed.setFullYear(today.getFullYear() - MIN_EMPLOYEE_AGE_YEARS);
      if (dob > startOfCalendarDay(youngestAllowed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Employee must be at least ${MIN_EMPLOYEE_AGE_YEARS} years old`,
          path: ["dateOfBirth"],
        });
      }

      const oldestAllowed = new Date(today);
      oldestAllowed.setFullYear(today.getFullYear() - MAX_EMPLOYEE_AGE_YEARS);
      if (dob < startOfCalendarDay(oldestAllowed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date of birth is not valid",
          path: ["dateOfBirth"],
        });
      }

      if (data.joiningDate) {
        const joining = startOfCalendarDay(data.joiningDate);
        if (joining <= dob) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Joining date must be after date of birth",
            path: ["joiningDate"],
          });
        }
      }
    }

    if (!data.whatsappSameAsPhone && !data.whatsappNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "WhatsApp number is required when it is not the same as phone",
        path: ["whatsappNumber"],
      });
    }
  });

export const editEmployeeFormSchema = z
  .object({
    firstName: personNameSchema("First name"),
    lastName: personNameSchema("Last name"),
    role: z.string().min(1, "Role is required"),
    designation: z.string().trim().min(1, "Designation is required"),
    departmentId: z.number().int().positive().optional(),
    phone: z
      .string()
      .refine((val) => !val.trim() || isValidPhoneNumber(val), {
        message:
          "Enter a valid phone number with the correct length for the selected country.",
      })
      .refine((val) => {
        if (!val.trim()) return true;
        const digits = val.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 15;
      }, "Phone number must contain 10 to 15 digits"),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    joiningDate: z.coerce.date().optional(),
    experienceYears: editExperienceYearsSchema(),
    skills: optionalSkillsSchema(),
    taxId: optionalPanSchema(),
    monthlySalary: optionalMonthlySalaryForEditSchema(),
    bankAccount: z.string().optional(),
    bankName: z.string().optional(),
    branch: z.string().optional(),
    ifsc: z.string().optional(),
    accountHolder: z.string().optional(),
    swiftCode: z.string().optional(),
    iban: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    refineJoiningDateOptional(data.joiningDate, ctx);
    refineFlatBankDetails(data, ctx);
  });

export type EditEmployeeFormValues = z.infer<typeof editEmployeeFormSchema>;

export const updateEmployeeProfileBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    firstName: personNameSchema("First name").optional(),
    lastName: personNameSchema("Last name").optional(),
    designation: z.string().trim().min(1, "Designation is required").optional(),
    departmentId: z.number().int().positive().optional(),
    phone: optionalPhoneSchema("Phone number").optional(),
    image: z.string().optional(),
    isActive: z.boolean().optional(),
    hasDashboardAccess: z.boolean().optional(),
    role: z.string().min(1).optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    experienceYears: z
      .number()
      .min(EXPERIENCE_MIN_YEARS)
      .max(EXPERIENCE_MAX_YEARS)
      .refine(
        (val) => Math.round(val * 10) === val * 10,
        "Use at most one decimal place for years of experience",
      )
      .optional(),
    taxId: optionalPanSchema().optional(),
    monthlySalary: optionalMonthlySalaryForEditSchema(),
    bankDetails: bankDetailsSchema.optional(),
    skills: z
      .array(
        z
          .string()
          .trim()
          .min(SKILL_ITEM_MIN_LENGTH)
          .max(SKILL_ITEM_MAX_LENGTH)
          .regex(SKILL_ITEM_PATTERN, "Skill contains invalid characters"),
      )
      .max(MAX_SKILLS_COUNT)
      .optional(),
    bio: z.string().max(500).optional(),
    linkedinUrl: z.string().url().optional().or(z.literal("")),
    twitterUrl: z.string().url().optional().or(z.literal("")),
    githubUrl: z.string().url().optional().or(z.literal("")),
    websiteUrl: z.string().url().optional().or(z.literal("")),
    joiningDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Joining date must be YYYY-MM-DD")
      .optional(),
    reportingTo: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.joiningDate) {
      refineJoiningDateOptional(new Date(data.joiningDate), ctx, ["joiningDate"]);
    }
  });

export const createWfhRequestInputSchema = z.object({
  date: z.date(),
  reason: z.string().max(500).optional(),
  approverId: z.string().min(1, "Approver is required"),
});

export const processWfhRequestInputSchema = z.object({
  requestId: z.number().int().positive(),
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().max(500).optional(),
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
  userId: z.string().optional(),
  deviceType: z.string().optional(),
  deviceName: z.string().optional(),
  serialNumber: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "LOST", "RETURNED"]).optional(),
  returnDate: z.date().optional(),
  notes: z.string().optional(),
});

export const createReviewCycleSchema = z.object({
  name: z.string().min(1, "Cycle name is required").max(100),
  type: z.enum(["QUARTERLY", "HALF_YEARLY", "ANNUAL", "CUSTOM"]).optional().default("QUARTERLY"),
  periodStart: z.string().min(1, "Start date is required"),
  periodEnd: z.string().min(1, "End date is required"),
  deadline: z.string().optional(),
  description: z.string().max(500).optional(),
});

export const updateReviewCycleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["QUARTERLY", "HALF_YEARLY", "ANNUAL", "CUSTOM"]).optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  deadline: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  description: z.string().max(500).optional(),
});

export const createPerformanceReviewSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  reviewerId: z.string().optional(),
  cycleId: z.number().int().positive().optional(),
  periodStart: z.string().min(1, "Start date is required"),
  periodEnd: z.string().min(1, "End date is required"),
  ratings: z.array(z.object({
    category: z.string().min(1),
    score: z.number().min(0).max(10),
    comment: z.string().optional(),
  })).optional(),
  strengths: z.string().max(2000).optional(),
  improvements: z.string().max(2000).optional(),
  overallRating: z.number().min(0).max(10).optional(),
  comments: z.string().max(2000).optional(),
});

export const updatePerformanceReviewSchema = z.object({
  ratings: z.array(z.object({
    category: z.string().min(1),
    score: z.number().min(0).max(10),
    comment: z.string().optional(),
  })).optional(),
  strengths: z.string().max(2000).optional(),
  improvements: z.string().max(2000).optional(),
  overallRating: z.number().min(0).max(10).optional(),
  comments: z.string().max(2000).optional(),
  status: z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]).optional(),
});

export const createOneOnOneSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  scheduledAt: z.string().min(1, "Date/time is required"),
  duration: z.number().int().min(15).max(180).optional().default(30),
  agenda: z.string().max(1000).optional(),
  meetingLink: z.string().url().optional().or(z.literal("")),
});

export const updateOneOnOneSchema = z.object({
  scheduledAt: z.string().optional(),
  duration: z.number().int().min(15).max(180).optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  notes: z.string().max(5000).optional(),
  actionItems: z.array(z.object({
    text: z.string().min(1),
    done: z.boolean(),
  })).optional(),
  agenda: z.string().max(1000).optional(),
  meetingLink: z.string().url().optional().or(z.literal("")),
});

export const generateEmployeePayslipInputSchema = z.object({
  userId: z.string().min(1),
  month: monthStringSchema,
  lopDays: z.number().int().min(0).max(30).optional().default(0),
  halfDays: z.number().int().min(0).max(30).optional().default(0),
  otherDeductions: z.number().min(0).optional().default(0),
  bonus: z.number().min(0).optional().default(0),
  overtimeType: z.enum(["days", "hours"]).optional(),
  overtimeDays: z.number().min(0).optional().default(0),
  overtimeHours: z.number().min(0).optional().default(0),
  overtimeAmount: z.number().min(0).optional().default(0),
  leaveDays: z.number().min(0).optional(),
});