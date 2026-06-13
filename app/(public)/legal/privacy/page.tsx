import type { Metadata } from "next";
import { LegalShell, LegalSection, PlainEnglish } from "@/features/legal/legal-shell";
import { BRAND_NAME, BRAND_DOMAIN, BRAND_SUPPORT_EMAIL } from "@/lib/branding";

export const metadata: Metadata = {
  title: `Privacy Policy — ${BRAND_NAME}`,
  description: `How ${BRAND_NAME} collects, uses, and protects your data.`,
  alternates: { canonical: "/legal/privacy" },
};

const sections = [
  { id: "who-we-are", title: "Who we are" },
  { id: "what-we-collect", title: "What we collect" },
  { id: "how-we-use", title: "How we use it" },
  { id: "legal-bases", title: "Legal bases (GDPR)" },
  { id: "sharing", title: "Who we share with" },
  { id: "subprocessors", title: "Subprocessors" },
  { id: "retention", title: "How long we keep it" },
  { id: "international", title: "International transfers" },
  { id: "your-rights", title: "Your rights" },
  { id: "security", title: "How we protect it" },
  { id: "children", title: "Children" },
  { id: "ai", title: "AI features" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact" },
];

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Privacy"
      title="Privacy Policy"
      intro={`This is the policy we follow when handling the personal data of anyone who uses ${BRAND_NAME} — visitors, customers, and the people inside our customers' organizations.`}
      effectiveDate="June 9, 2026"
      sections={sections}
    >
      <LegalSection id="who-we-are" title="Who we are">
        <p>
          {BRAND_NAME} is a SaaS platform for HR, projects, CRM, chat, and analytics. We operate
          at <span className="font-mono text-blue-600">{BRAND_DOMAIN}</span>. When you sign up
          for an account, your organization is the <em>controller</em> of the data you put into
          {" "}{BRAND_NAME} — we&apos;re the <em>processor</em>. When you visit our marketing
          site or talk to us through this site&apos;s forms, we&apos;re the controller.
        </p>
        <p>
          The two roles are governed differently. This policy covers both — and we&apos;ll
          flag which is which when the answer depends on it.
        </p>
      </LegalSection>

      <LegalSection id="what-we-collect" title="What we collect">
        <PlainEnglish>
          The boring stuff you&apos;d expect: an account email, your name, what you do inside
          the product, and the content you create. Nothing creepy, no hidden trackers.
        </PlainEnglish>
        <p>We collect three categories of information:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Account data:</strong> name, work email, company, phone (optional), role.
            Provided by you at signup or when invited into a workspace.
          </li>
          <li>
            <strong>Content you create:</strong> employee records, projects, leads, messages,
            files, payroll runs — whatever you put into the product. This is your customer
            data; you own it. We hold it on your behalf.
          </li>
          <li>
            <strong>Operational data:</strong> IP address, browser, login timestamps, audit
            events, and the kind of feature-usage metrics we need to keep the platform fast
            and to debug issues. We don&apos;t use this for advertising.
          </li>
        </ul>
        <p>
          We don&apos;t buy personal data from third parties, and we don&apos;t build
          behavioural ad profiles. The only third-party data we touch is what you choose to
          import (CSV uploads, Google Calendar events, etc.).
        </p>
      </LegalSection>

      <LegalSection id="how-we-use" title="How we use it">
        <p>Six purposes — that&apos;s the whole list.</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong>Run the product.</strong> Authenticate you, render your dashboard, deliver
            chat messages, generate payslips — the things you signed up for.
          </li>
          <li>
            <strong>Bill correctly.</strong> Track seat counts and invoice usage where the
            plan requires it.
          </li>
          <li>
            <strong>Support you.</strong> When you write to us, our team reads the message and
            replies. We don&apos;t outsource support to data brokers.
          </li>
          <li>
            <strong>Keep it secure.</strong> Detect suspicious logins, rate-limit abuse, run
            audit logs.
          </li>
          <li>
            <strong>Improve the product.</strong> Aggregate, de-identified usage stats — never
            individual user behaviour matched to a name.
          </li>
          <li>
            <strong>Comply with the law.</strong> When we have to.
          </li>
        </ol>
        <p>
          We do not sell personal data. Full stop. No carve-outs, no &ldquo;sharing for valid
          business purposes&rdquo; that means selling, no behavioural ad networks.
        </p>
      </LegalSection>

      <LegalSection id="legal-bases" title="Legal bases (GDPR)">
        <p>
          If you&apos;re in the EU/UK, here are the GDPR Article 6 legal bases we rely on,
          mapped to each purpose:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Contract</strong> — running the product, supporting you, billing you.
          </li>
          <li>
            <strong>Legitimate interest</strong> — security, fraud prevention, debugging.
            We&apos;ve documented our LIA (legitimate interest assessment) and it&apos;s
            available on request.
          </li>
          <li>
            <strong>Legal obligation</strong> — responding to lawful requests, tax records,
            etc.
          </li>
          <li>
            <strong>Consent</strong> — only where required, e.g. optional analytics cookies
            and marketing emails. You can withdraw consent any time.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="sharing" title="Who we share with">
        <p>Three groups, and three groups only.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Subprocessors</strong> — vendors we&apos;ve carefully selected to host,
            send email, deliver realtime messages, etc. The current list is in the next
            section.
          </li>
          <li>
            <strong>Within your workspace</strong> — colleagues in your organization see what
            their role permits via our RBAC system. The HR admin sees payroll; the engineer
            doesn&apos;t. You configure who sees what.
          </li>
          <li>
            <strong>When the law requires it</strong> — court orders, lawful warrants. If we
            can notify you first, we will (unless legally prohibited).
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="subprocessors" title="Subprocessors">
        <p>
          We use a small, deliberate list of subprocessors. Adding one is a decision, not a
          default.
        </p>
        <div className="not-prose overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-[11px] font-medium text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Vendor</th>
                <th className="px-4 py-2.5 text-left font-medium">Purpose</th>
                <th className="px-4 py-2.5 text-left font-medium">Region</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ["Neon (Postgres)", "Primary database", "AP Southeast 1 / your region"],
                ["Cloudflare R2", "File storage (avatars, attachments, payslips)", "Global"],
                ["SendGrid", "Transactional email (auth, notifications)", "US"],
                ["Ably", "Realtime chat and presence", "Global edge"],
                ["Inngest", "Background jobs and scheduled reports", "US / EU"],
                ["Upstash Redis", "Rate limiting and session cache", "Your region"],
                ["OpenAI / Google AI", "Optional AI features (you can disable)", "US"],
                ["Vercel", "Hosting and edge delivery", "Global"],
              ].map(([vendor, purpose, region]) => (
                <tr key={vendor}>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{vendor}</td>
                  <td className="px-4 py-2.5 text-slate-600">{purpose}</td>
                  <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">{region}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          We notify customers at least 30 days before adding a new subprocessor with access to
          customer data. Enterprise customers receive the notice via email; everyone else gets
          it from the changelog of this page.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="How long we keep it">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Active accounts:</strong> as long as you&apos;re a customer plus the
            duration needed to fulfil legal obligations (typically 7 years for invoices in
            India).
          </li>
          <li>
            <strong>Closed accounts:</strong> all customer content is permanently deleted 90
            days after account closure, unless legally required to keep it longer. You can
            request immediate deletion in writing.
          </li>
          <li>
            <strong>Operational logs:</strong> 13 months, then automatically purged.
          </li>
          <li>
            <strong>Contact form submissions:</strong> 24 months from your last interaction.
          </li>
          <li>
            <strong>Backups:</strong> 30 days rolling, automatically expired.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="international" title="International transfers">
        <p>
          Our primary region is AP Southeast 1 (Singapore). For customers in the EU, UK, or
          requiring data residency in their region, we offer dedicated infrastructure on the
          Enterprise plan.
        </p>
        <p>
          Where personal data is transferred out of the EU/UK to a country without an adequacy
          decision, we rely on the European Commission&apos;s Standard Contractual Clauses
          (2021) and supplementary measures described in our security documentation.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="Your rights">
        <p>
          Wherever you are, you can ask us to do the following with your personal data. If
          you&apos;re an end-user of one of our customers, we&apos;ll forward your request to
          the controller (your employer) since they hold the relationship with you.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Access</strong> — get a copy of the data we hold about you.
          </li>
          <li>
            <strong>Correct</strong> — fix anything that&apos;s wrong.
          </li>
          <li>
            <strong>Delete</strong> — &ldquo;right to be forgotten&rdquo; subject to legal
            retention obligations.
          </li>
          <li>
            <strong>Port</strong> — export in a machine-readable format.
          </li>
          <li>
            <strong>Object</strong> — to any processing based on legitimate interest.
          </li>
          <li>
            <strong>Withdraw consent</strong> — wherever we relied on consent.
          </li>
        </ul>
        <p>
          Email{" "}
          <a href={`mailto:${BRAND_SUPPORT_EMAIL}`} className="font-mono text-blue-600 hover:underline">
            {BRAND_SUPPORT_EMAIL}
          </a>{" "}
          with your request. We respond within 30 days, usually within 5.
        </p>
      </LegalSection>

      <LegalSection id="security" title="How we protect it">
        <p>
          A short summary lives here; the full picture is in our{" "}
          <a href="/legal/security" className="text-blue-600 hover:underline">
            Security page
          </a>
          . In brief: TLS 1.2+ in transit, AES-256 at rest, MFA available on every account,
          role-based access throughout, audited dependencies, and we don&apos;t store
          plaintext passwords (bcrypt with cost-factor 12).
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children">
        <p>
          {BRAND_NAME} is not intended for anyone under 16. We don&apos;t knowingly collect
          data from children. If a parent or guardian discovers their child has created an
          account, contact us and we&apos;ll delete it.
        </p>
      </LegalSection>

      <LegalSection id="ai" title="AI features">
        <p>
          Several features (lead scoring, smart summaries, email drafts, attrition risk) call
          third-party LLM APIs — currently OpenAI and Google. When you use them:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Prompts are scoped to the minimum context required for the feature. We don&apos;t
            send your whole database every time you ask for a summary.
          </li>
          <li>
            We&apos;ve elected not to allow the provider to use submitted data to train their
            models, where the provider offers that option.
          </li>
          <li>
            AI features can be disabled at the organization level from{" "}
            <span className="font-mono text-blue-600">Settings &rarr; AI</span>.
          </li>
          <li>
            Enterprise customers may bring their own API key (BYOK) so the model traffic
            never traverses our infrastructure beyond proxying.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="changes" title="Changes to this policy">
        <p>
          When we make a material change to this policy we&apos;ll email account owners at
          least 14 days before it takes effect. Minor edits (typo fixes, restructuring) are
          published silently, but you can always check the &ldquo;effective&rdquo; date at the
          top of the page.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          Privacy questions, requests, complaints — write to{" "}
          <a href={`mailto:${BRAND_SUPPORT_EMAIL}`} className="font-mono text-blue-600 hover:underline">
            {BRAND_SUPPORT_EMAIL}
          </a>
          . For formal data protection enquiries, address them &ldquo;Attn: Data Protection
          Officer.&rdquo; If you&apos;re in the EU and unhappy with our response, you have
          the right to complain to your local supervisory authority.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
