import type { Metadata } from "next";
import { LegalShell, LegalSection, PlainEnglish } from "@/features/legal/legal-shell";
import { BRAND_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: `Security — ${BRAND_NAME}`,
  description: `How ${BRAND_NAME} secures customer data, infrastructure, and the development pipeline.`,
  alternates: { canonical: "/legal/security" },
};

const sections = [
  { id: "philosophy", title: "Our approach" },
  { id: "infrastructure", title: "Infrastructure" },
  { id: "encryption", title: "Encryption" },
  { id: "auth", title: "Authentication & access" },
  { id: "access-control", title: "Access control inside your workspace" },
  { id: "secrets", title: "Secrets & key management" },
  { id: "dev", title: "Secure development" },
  { id: "backups", title: "Backups & disaster recovery" },
  { id: "monitoring", title: "Monitoring & incident response" },
  { id: "compliance", title: "Compliance posture" },
  { id: "vulnerability", title: "Reporting vulnerabilities" },
  { id: "questions", title: "Security questions" },
];

export default function SecurityPage() {
  return (
    <LegalShell
      eyebrow="Security"
      title="Security at StreamlineOS"
      intro={`Security is a feature, not a paragraph at the end of a sales deck. Here's how ${BRAND_NAME} actually protects your data — written for the engineer or CISO doing the review.`}
      effectiveDate="June 9, 2026"
      sections={sections}
    >
      <LegalSection id="philosophy" title="Our approach">
        <p>
          We optimize for boring, audited primitives over clever, untested ones. We pay for
          hosted services with strong security postures (Vercel, Neon, Cloudflare) instead of
          rolling our own. We minimize the surface area: less code, less custom infrastructure,
          fewer subprocessors. Where we can&apos;t avoid risk, we make it visible — through
          audit logs you can read and access controls you can configure.
        </p>
      </LegalSection>

      <LegalSection id="infrastructure" title="Infrastructure">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Application:</strong> hosted on Vercel — edge-rendered Next.js with
            automatic TLS termination, DDoS protection, and immutable deployments.
          </li>
          <li>
            <strong>Database:</strong> Neon Postgres in <code>ap-southeast-1</code> by default.
            Logical isolation per organization is enforced at the application layer via
            row-level filters; physical isolation is available on Enterprise.
          </li>
          <li>
            <strong>File storage:</strong> Cloudflare R2 with server-side encryption,
            pre-signed URLs scoped per organization, and CORS restrictions.
          </li>
          <li>
            <strong>Realtime:</strong> Ably for chat and presence. Tokens are short-lived and
            channel-scoped; no client ever holds an org-wide credential.
          </li>
          <li>
            <strong>Background jobs:</strong> Inngest. Job payloads are encrypted at rest and
            scoped to a specific org context.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="encryption" title="Encryption">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>In transit:</strong> TLS 1.2+ everywhere. HSTS enabled with a 2-year
            max-age and <code>includeSubDomains</code>. We score A+ on Qualys SSL Labs.
          </li>
          <li>
            <strong>At rest:</strong> AES-256 for database storage (Neon-managed), R2 object
            storage, and encrypted backups.
          </li>
          <li>
            <strong>Application-layer:</strong> sensitive fields (e.g. integration API keys,
            TOTP secrets) are encrypted with an org-specific derived key before being written
            to the database. The master key never leaves the application&apos;s secret store.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="auth" title="Authentication & access">
        <PlainEnglish>
          We never store your password. We hash it. We support multi-factor authentication.
          We rate-limit logins. We log every session.
        </PlainEnglish>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Password hashing:</strong> bcrypt with cost factor 12. Plaintext passwords
            never touch disk.
          </li>
          <li>
            <strong>MFA:</strong> TOTP-based (Google Authenticator, 1Password, Authy)
            available to every user. Workspace owners can require it for the whole org.
          </li>
          <li>
            <strong>SSO/SAML:</strong> available on Enterprise.
          </li>
          <li>
            <strong>Sessions:</strong> rotating JWT refresh tokens, 30-day expiry, idle
            timeout of 30 days for the dashboard. Active sessions are listed in your account
            settings; you can revoke any of them.
          </li>
          <li>
            <strong>Lockouts:</strong> exponential backoff after failed login attempts; full
            lockout after 10 attempts within 15 minutes.
          </li>
          <li>
            <strong>IP allow-listing:</strong> configurable per organization.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="access-control" title="Access control inside your workspace">
        <p>
          Every action in {BRAND_NAME} is gated by a role-based permission system.
          Out-of-the-box roles include CEO, HR, ADMIN, MANAGER, MEMBER, SALES, ENGINEERING,
          DESIGN, plus branch-scoped variants. Permissions are checked on the server, never
          on the client.
        </p>
        <p>
          Every privileged action — payroll runs, role changes, mass exports, payslip
          downloads — is recorded in the audit log with timestamp, actor, IP, and a
          tamper-evident hash. Audit logs are retained for 13 months and exportable on
          demand.
        </p>
      </LegalSection>

      <LegalSection id="secrets" title="Secrets & key management">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Application secrets live in Vercel&apos;s encrypted environment store; they
            don&apos;t enter the repository.
          </li>
          <li>
            Production access is restricted to a small set of engineers, every access is
            logged, and credentials are rotated quarterly (or immediately on offboarding).
          </li>
          <li>
            Integration API keys you bring into the workspace (Razorpay, Ably, etc.)
            are encrypted application-side before storage and decrypted only inside the
            request that needs them.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="dev" title="Secure development">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Static analysis:</strong> ESLint and TypeScript run on every commit; the
            build fails on any error.
          </li>
          <li>
            <strong>Dependency scanning:</strong> automated weekly via GitHub Dependabot;
            high-severity advisories are patched within 72 hours.
          </li>
          <li>
            <strong>Branch protection:</strong> all production deploys require a PR with at
            least one reviewer and a passing CI pipeline. No direct pushes to{" "}
            <code>main</code>.
          </li>
          <li>
            <strong>Content Security Policy:</strong> strict CSP with no
            <code>unsafe-eval</code>, frame-ancestors set to <code>none</code>, and X-Frame-
            Options DENY.
          </li>
          <li>
            <strong>OWASP Top 10:</strong> tracked as part of our quarterly review. We
            specifically audit for injection, broken access control, and SSRF before each
            release.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="backups" title="Backups & disaster recovery">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Database backups:</strong> point-in-time recovery for the last 30 days
            (Neon).
          </li>
          <li>
            <strong>File storage:</strong> R2 supports object versioning; deleted objects are
            recoverable for 30 days.
          </li>
          <li>
            <strong>RPO target:</strong> 5 minutes.
          </li>
          <li>
            <strong>RTO target:</strong> 4 hours for the application; 1 hour for read-only
            mode.
          </li>
          <li>
            <strong>Disaster drill:</strong> we run a recovery exercise quarterly.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="monitoring" title="Monitoring & incident response">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Real-time monitoring with on-call rotation. Critical alerts page the engineer on
            duty within 60 seconds.
          </li>
          <li>
            We publish a public status page; incidents are posted within 30 minutes of
            detection.
          </li>
          <li>
            We follow a documented incident response runbook with severity levels, comms
            templates, and a post-incident review for any Sev-1 or Sev-2 event.
          </li>
          <li>
            For incidents that affect customer data we notify the workspace owner within 72
            hours and publish a post-mortem within 14 days.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="compliance" title="Compliance posture">
        <p>
          We&apos;re building toward formal certifications. The current state is honest, not
          aspirational:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>GDPR:</strong> our practices align with the regulation; the practical
            controls are documented in our Privacy Policy and DPA (available on Enterprise).
          </li>
          <li>
            <strong>SOC 2 Type II:</strong> Type I report in progress. Type II audit scheduled
            once we&apos;ve been operating the relevant controls continuously for six months.
          </li>
          <li>
            <strong>ISO 27001:</strong> we operate the equivalent control set; certification
            is on the 2027 roadmap.
          </li>
          <li>
            <strong>India DPDP Act 2023:</strong> compliant. We treat the workspace owner
            the &ldquo;data fiduciary&rdquo; for their content; we act as the
            &ldquo;data processor.&rdquo;
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="vulnerability" title="Reporting vulnerabilities">
        <p>
          We&apos;re grateful for the security research community. If you&apos;ve found
          something, please:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Email{" "}
            <a href="mailto:security@streamlineos.app" className="font-mono text-blue-600 hover:underline">
              security@streamlineos.app
            </a>{" "}
            with a clear description and reproduction steps.
          </li>
          <li>Give us 90 days to respond before publishing.</li>
          <li>
            Don&apos;t exfiltrate data beyond proof-of-concept, don&apos;t test against
            customer workspaces, and don&apos;t run automated scanners without prior approval.
          </li>
        </ul>
        <p>
          In return we&apos;ll acknowledge your report within 48 hours, keep you updated, and
          credit you (with your permission) once the issue is fixed. We don&apos;t currently
          run a paid bounty programme but we send thank-you swag and recommendations on
          request.
        </p>
      </LegalSection>

      <LegalSection id="questions" title="Security questions">
        <p>
          For security questionnaires, pen-test reports, or due-diligence requests during
          enterprise procurement, write to{" "}
          <a href="mailto:security@streamlineos.app" className="font-mono text-blue-600 hover:underline">
            security@streamlineos.app
          </a>
          . We respond within two business days.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
