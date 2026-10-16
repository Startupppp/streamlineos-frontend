import type { ComponentType } from "@/types/payroll/setup";

interface RoleSubject {
  code: string;
  name: string;
  type: ComponentType;
}

const ROLE_RULES: readonly { role: string; type: ComponentType; codes: readonly string[]; name: RegExp }[] = [
  { role: "Basic", type: "EARNING", codes: ["BASIC"], name: /\bbasic\b/i },
  { role: "HRA", type: "EARNING", codes: ["HRA"], name: /\bhra\b|\bhouse rent\b/i },
  { role: "Provident Fund", type: "DEDUCTION", codes: ["PF", "PF_EMP", "EPF", "EPF_EMPLOYEE"], name: /\be?pf\b|\bprovident fund\b/i },
  { role: "Professional Tax", type: "DEDUCTION", codes: ["PT", "PROFESSIONAL_TAX"], name: /\bpt\b|\bprof(essional)?\.?\s*tax\b/i },
  { role: "ESI", type: "DEDUCTION", codes: ["ESI", "ESI_EMP", "ESI_EMPLOYEE"], name: /\besic?\b|\bstate insurance\b/i },
];

const NOT_A_ROLE_NAME = /\bvoluntary\b|\bvpf\b|\barrears?\b/i;

export function componentRole(subject: RoleSubject): string | null {
  const code = subject.code.toUpperCase();
  for (const rule of ROLE_RULES) {
    if (subject.type !== rule.type) continue;
    if (rule.codes.includes(code)) return rule.role;
    if (rule.name.test(subject.name) && !NOT_A_ROLE_NAME.test(subject.name)) return rule.role;
  }
  return null;
}

export function duplicatedRoles(subjects: readonly RoleSubject[]): ReadonlySet<string> {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const subject of subjects) {
    const role = componentRole(subject);
    if (!role) continue;
    if (seen.has(role)) duplicated.add(role);
    seen.add(role);
  }
  return duplicated;
}
