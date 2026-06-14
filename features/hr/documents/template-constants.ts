export const TEMPLATE_TYPES = [
  { value: "OFFER_LETTER", label: "Offer Letter" },
  { value: "NDA", label: "Non-Disclosure Agreement (NDA)" },
  { value: "POLICY", label: "Company Policy" },
  { value: "WELCOME", label: "Welcome Letter" },
  { value: "OTHER", label: "Other" },
] as const;

export const COMMON_TOKENS = [
  "Candidate_Name",
  "Job_Title",
  "Salary",
  "Start_Date",
  "Company_Name",
  "Manager_Name",
  "Department",
  "Location",
  "Probation_Period",
  "Reporting_To",
] as const;

export const SAMPLE_VARS: Record<string, string> = {
  Candidate_Name: "John Doe",
  Job_Title: "Senior Engineer",
  Salary: "₹12,00,000 p.a.",
  Start_Date: "May 1, 2026",
  Company_Name: "StreamlineOS",
  Manager_Name: "Priya Sharma",
  Department: "Engineering",
  Location: "Mumbai, India",
  Probation_Period: "3 months",
  Reporting_To: "Priya Sharma",
};

export const DEFAULT_HTML: Record<string, string> = {
  OFFER_LETTER: `<h1>Offer Letter</h1>
<p>Dear {{Candidate_Name}},</p>
<p>We are pleased to offer you the position of <strong>{{Job_Title}}</strong> at <strong>{{Company_Name}}</strong>.</p>
<h2>Compensation &amp; Benefits</h2>
<ul>
  <li>Base Salary: {{Salary}} per annum</li>
  <li>Start Date: {{Start_Date}}</li>
  <li>Probation Period: {{Probation_Period}}</li>
  <li>Reporting To: {{Reporting_To}}</li>
</ul>
<p>Please sign and return this letter by <em>[Acceptance Deadline]</em>.</p>
<p>Sincerely,<br/>{{Manager_Name}}<br/>{{Company_Name}}</p>`,

  NDA: `<h1>Non-Disclosure Agreement</h1>
<p>This agreement is entered into between <strong>{{Company_Name}}</strong> and <strong>{{Candidate_Name}}</strong> effective {{Start_Date}}.</p>
<h2>1. Confidential Information</h2>
<p>...</p>
<h2>2. Obligations</h2>
<p>...</p>
<p>Signed,<br/>{{Candidate_Name}}</p>`,

  POLICY: `<h1>Company Policy: [Policy Name]</h1>
<h2>1. Purpose</h2>
<p>This policy outlines the guidelines for all employees of <strong>{{Company_Name}}</strong>.</p>
<h2>2. Scope</h2>
<p>Applies to all staff in the <strong>{{Department}}</strong> department.</p>
<h2>3. Policy Details</h2>
<p>...</p>`,

  WELCOME: `<h1>Welcome to {{Company_Name}}!</h1>
<p>Dear {{Candidate_Name}},</p>
<p>We are thrilled to have you join us as <strong>{{Job_Title}}</strong> starting <strong>{{Start_Date}}</strong>.</p>
<p>Your manager <strong>{{Manager_Name}}</strong> will be in touch to help you get started.</p>
<p>Best regards,<br/>HR Team, {{Company_Name}}</p>`,

  OTHER: `<h1>Document Title</h1>
<p>Dear {{Candidate_Name}},</p>
<p>...</p>`,
};
