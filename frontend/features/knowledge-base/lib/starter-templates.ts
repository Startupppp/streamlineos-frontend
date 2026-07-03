type SlateBlock = {
  type: "h1" | "h2" | "h3" | "p" | "blockquote";
  children: Array<{ text: string }>;
};

export type StarterTemplateContent = {
  type: "doc";
  children: SlateBlock[];
};

export type StarterTemplate = {
  key: string;
  name: string;
  icon: string;
  description: string;
  content: StarterTemplateContent;
};

export function deriveContentText(content: StarterTemplateContent): string {
  return content.children
    .flatMap((block) => block.children.map((c) => c.text))
    .filter(Boolean)
    .join("\n");
}

function doc(...children: SlateBlock[]): StarterTemplateContent {
  return { type: "doc", children };
}

function h1(text: string): SlateBlock {
  return { type: "h1", children: [{ text }] };
}

function h2(text: string): SlateBlock {
  return { type: "h2", children: [{ text }] };
}

function h3(text: string): SlateBlock {
  return { type: "h3", children: [{ text }] };
}

function p(text = ""): SlateBlock {
  return { type: "p", children: [{ text }] };
}

function blockquote(text: string): SlateBlock {
  return { type: "blockquote", children: [{ text }] };
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    key: "meeting-notes",
    name: "Meeting Notes",
    icon: "📝",
    description: "Capture attendees, agenda, decisions, and action items from a meeting.",
    content: doc(
      h1("Meeting Notes"),
      blockquote("Date · Facilitator · Location"),
      h2("Attendees"),
      p(""),
      h2("Agenda"),
      p("1. "),
      h2("Notes"),
      p(""),
      h2("Decisions"),
      p(""),
      h2("Action Items"),
      p("Owner · Due date · Task"),
    ),
  },
  {
    key: "sop",
    name: "Standard Operating Procedure",
    icon: "📋",
    description: "Document repeatable processes with clear steps, scope, and ownership.",
    content: doc(
      h1("Standard Operating Procedure"),
      blockquote("Version · Effective date · Owner"),
      h2("Purpose"),
      p("Describe what this procedure achieves and why it exists."),
      h2("Scope"),
      p("Who this applies to and any exclusions."),
      h2("Prerequisites"),
      p("Tools, access, or knowledge required before starting."),
      h2("Procedure"),
      p("Step 1: "),
      p("Step 2: "),
      p("Step 3: "),
      h2("Exceptions & Edge Cases"),
      p(""),
      h2("Related Documents"),
      p(""),
    ),
  },
  {
    key: "policy",
    name: "Policy",
    icon: "📌",
    description: "Define organisational rules, responsibilities, and enforcement.",
    content: doc(
      h1("Policy Title"),
      blockquote("Version · Approved by · Review date"),
      h2("Overview"),
      p("High-level summary of this policy and the problem it addresses."),
      h2("Scope"),
      p("Who and what this policy covers."),
      h2("Policy Statement"),
      p("The specific rules or requirements employees must follow."),
      h2("Responsibilities"),
      p("Role: Responsibility"),
      h2("Enforcement"),
      p("Consequences of non-compliance."),
      h2("Review & Amendments"),
      p("How and when this policy will be reviewed."),
    ),
  },
  {
    key: "decision-record",
    name: "Decision Record",
    icon: "🧭",
    description: "Record the context, options considered, and rationale behind a key decision.",
    content: doc(
      h1("Decision: "),
      blockquote("Date · Deciders · Status: Proposed | Accepted | Superseded"),
      h2("Context"),
      p("What problem are we solving? What forces drove this decision?"),
      h2("Options Considered"),
      h3("Option A"),
      p("Description and trade-offs."),
      h3("Option B"),
      p("Description and trade-offs."),
      h2("Decision"),
      p("The chosen option and the primary reason."),
      h2("Consequences"),
      p("What becomes easier or harder as a result of this decision?"),
    ),
  },
  {
    key: "runbook",
    name: "Runbook",
    icon: "🔧",
    description: "Step-by-step operational guide for running or recovering a service or process.",
    content: doc(
      h1("Runbook: "),
      blockquote("Service · Owner · Last verified"),
      h2("Overview"),
      p("What does this runbook cover and when should it be used?"),
      h2("Prerequisites"),
      p("Access, credentials, and tools needed."),
      h2("Steps"),
      p("Step 1: "),
      p("Step 2: "),
      p("Step 3: "),
      h2("Rollback"),
      p("How to undo these steps if something goes wrong."),
      h2("Verification"),
      p("How to confirm the procedure completed successfully."),
      h2("Escalation Contacts"),
      p("Name · Role · Contact"),
    ),
  },
  {
    key: "project-brief",
    name: "Project Brief",
    icon: "🚀",
    description: "Define the goals, scope, timeline, and stakeholders for a project.",
    content: doc(
      h1("Project Brief: "),
      blockquote("Status · Start date · Target date · Owner"),
      h2("Overview"),
      p("One or two sentences on what this project is and why it matters."),
      h2("Goals"),
      p("What does success look like? List measurable outcomes."),
      h2("Scope"),
      h3("In Scope"),
      p(""),
      h3("Out of Scope"),
      p(""),
      h2("Timeline"),
      p("Milestone · Target date"),
      h2("Stakeholders"),
      p("Name · Role · Involvement"),
      h2("Risks & Dependencies"),
      p("Risk or dependency · Mitigation"),
    ),
  },
  {
    key: "playbook",
    name: "Playbook",
    icon: "📖",
    description: "Guide teams through a repeatable strategy or tactical situation.",
    content: doc(
      h1("Playbook: "),
      blockquote("Team · Last updated · Owner"),
      h2("Purpose"),
      p("What situation does this playbook address?"),
      h2("When to Use This Playbook"),
      p("Triggers and conditions that activate this playbook."),
      h2("Stakeholders & Roles"),
      p("Role · Responsibility"),
      h2("Steps"),
      p("Step 1: "),
      p("Step 2: "),
      p("Step 3: "),
      h2("Communication Template"),
      p("Suggested internal/external messaging."),
      h2("References"),
      p(""),
    ),
  },
  {
    key: "troubleshooting-guide",
    name: "Troubleshooting Guide",
    icon: "🔍",
    description: "Help users diagnose and resolve a known issue or class of errors.",
    content: doc(
      h1("Troubleshooting: "),
      blockquote("Affected system · Severity · Owner"),
      h2("Symptoms"),
      p("Describe observable signs that this issue is occurring."),
      h2("Common Causes"),
      p("1. "),
      p("2. "),
      h2("Diagnostic Steps"),
      p("Step 1: Check "),
      p("Step 2: Check "),
      h2("Solutions"),
      h3("Fix A"),
      p(""),
      h3("Fix B"),
      p(""),
      h2("When to Escalate"),
      p("Escalate if symptoms persist after trying the above fixes."),
    ),
  },
  {
    key: "support-article",
    name: "Support Article",
    icon: "💬",
    description: "Answer a customer question or explain how to use a feature.",
    content: doc(
      h1("How to "),
      h2("Overview"),
      p("Brief summary of what this article covers."),
      h2("Prerequisites"),
      p("What the reader needs before following these steps."),
      h2("Steps"),
      p("1. "),
      p("2. "),
      p("3. "),
      h2("Troubleshooting"),
      p("Common problems and solutions."),
      h2("Related Articles"),
      p(""),
    ),
  },
  {
    key: "onboarding-guide",
    name: "Onboarding Guide",
    icon: "🙌",
    description: "Help new team members get up to speed quickly.",
    content: doc(
      h1("Welcome to the Team!"),
      blockquote("Role · Team · Manager · Start date"),
      h2("Getting Started"),
      p("Things to do in your first 24 hours."),
      h2("Tools & Access"),
      p("Tool · Where to get access · Who to ask"),
      h2("Key Contacts"),
      p("Name · Role · How to reach them"),
      h2("Your First Week"),
      p("Day 1: "),
      p("Day 2–3: "),
      p("Day 4–5: "),
      h2("30 / 60 / 90 Day Goals"),
      p("30 days: "),
      p("60 days: "),
      p("90 days: "),
    ),
  },
  {
    key: "weekly-update",
    name: "Weekly Update",
    icon: "📅",
    description: "Share progress, blockers, and plans with your team each week.",
    content: doc(
      h1("Weekly Update — Week of "),
      h2("Highlights"),
      p("The most important thing that happened this week."),
      h2("Completed"),
      p(""),
      h2("In Progress"),
      p(""),
      h2("Blockers"),
      p("What is slowing you down and what you need."),
      h2("Next Week"),
      p(""),
      h2("Metrics"),
      p("Key number · Value · vs. Last week"),
    ),
  },
  {
    key: "retrospective",
    name: "Retrospective",
    icon: "🔁",
    description: "Reflect on a sprint or project to improve team process.",
    content: doc(
      h1("Retrospective — "),
      blockquote("Date · Facilitator · Team"),
      h2("What Went Well"),
      p(""),
      h2("What Didn't Go Well"),
      p(""),
      h2("Surprises"),
      p("Things that caught the team off guard."),
      h2("Action Items"),
      p("Action · Owner · Due date"),
      h2("Decisions"),
      p(""),
    ),
  },
  {
    key: "prd",
    name: "Product Requirements Document",
    icon: "📊",
    description: "Define goals, user stories, and requirements for a product or feature.",
    content: doc(
      h1("PRD: "),
      blockquote("Status: Draft | In Review | Approved · Owner · Target quarter"),
      h2("Problem Statement"),
      p("What user or business problem does this solve?"),
      h2("Goals & Success Metrics"),
      p("Goal · How we measure it"),
      h2("Non-Goals"),
      p("What this explicitly does not address."),
      h2("User Stories"),
      p("As a [persona], I want to [action] so that [outcome]."),
      h2("Requirements"),
      h3("Functional"),
      p(""),
      h3("Non-Functional"),
      p("Performance, security, accessibility requirements."),
      h2("Open Questions"),
      p(""),
    ),
  },
  {
    key: "how-to",
    name: "How-to Guide",
    icon: "✅",
    description: "Walk readers through completing a specific task step by step.",
    content: doc(
      h1("How to "),
      h2("Overview"),
      p("What you will accomplish and how long it should take."),
      h2("Prerequisites"),
      p("What you need before you begin."),
      h2("Steps"),
      p("1. "),
      p("2. "),
      p("3. "),
      h2("Expected Result"),
      p("What you should see or have when finished."),
      h2("Tips"),
      p(""),
      h2("Related Guides"),
      p(""),
    ),
  },
  {
    key: "faq",
    name: "FAQ",
    icon: "❓",
    description: "Answer the most common questions about a topic in one place.",
    content: doc(
      h1("Frequently Asked Questions"),
      h2("Introduction"),
      p("Brief context on what this FAQ covers."),
      h2("General"),
      h3("Q: What is ?"),
      p("A: "),
      h3("Q: How do I ?"),
      p("A: "),
      h2("Troubleshooting"),
      h3("Q: Why isn't working?"),
      p("A: "),
      h2("Contact & Support"),
      p("For questions not answered here, reach out to "),
    ),
  },
];
