import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, LegalSection, PlainEnglish } from "@/features/legal/legal-shell";
import { BRAND_NAME, BRAND_DOMAIN, BRAND_SUPPORT_EMAIL } from "@/lib/branding";
import { PRICING } from "@/lib/pricing";

export const metadata: Metadata = {
  title: `Terms of Service — ${BRAND_NAME}`,
  description: `The agreement between you and ${BRAND_NAME} for use of the platform.`,
  alternates: { canonical: "/legal/terms" },
};

const sections = [
  { id: "agreement", title: "The agreement" },
  { id: "account", title: "Your account" },
  { id: "use", title: "How you can use the service" },
  { id: "subscription", title: "Subscription & billing" },
  { id: "free-trial", title: "Free tier & trials" },
  { id: "your-content", title: "Your content stays yours" },
  { id: "our-rights", title: "Our rights" },
  { id: "beta", title: "Beta features" },
  { id: "uptime", title: "Uptime & support" },
  { id: "suspension", title: "Suspension & termination" },
  { id: "disclaimer", title: "Disclaimer of warranties" },
  { id: "liability", title: "Limitation of liability" },
  { id: "indemnity", title: "Indemnity" },
  { id: "governing-law", title: "Governing law" },
  { id: "changes", title: "Changes" },
  { id: "contact", title: "Contact" },
];

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Terms of Service"
      title="Terms of Service"
      intro={`These terms govern your use of ${BRAND_NAME}. By signing up or accessing the platform, you accept them on behalf of yourself and (if applicable) your organization.`}
      effectiveDate="June 9, 2026"
      sections={sections}
    >
      <LegalSection id="agreement" title="The agreement">
        <p>
          These terms are a binding agreement between {BRAND_NAME} (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;) and the person or organization signing up (&ldquo;you&rdquo;,
          &ldquo;your team&rdquo;). If you&apos;re accepting on behalf of an organization, you
          confirm you have authority to bind it.
        </p>
        <p>
          The terms apply to everything at{" "}
          <span className="font-mono text-blue-600">{BRAND_DOMAIN}</span> and any subdomains —
          marketing site, application, APIs, embeds, the lot.
        </p>
      </LegalSection>

      <LegalSection id="account" title="Your account">
        <p>
          When you create an account, you agree to:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Provide accurate information and keep it up to date.</li>
          <li>Keep your credentials confidential. Enable MFA — we strongly recommend it.</li>
          <li>
            Notify us immediately if you suspect unauthorized access (write to{" "}
            <a href="mailto:security@streamlineos.app" className="font-mono text-blue-600 hover:underline">
              security@streamlineos.app
            </a>
            ).
          </li>
          <li>
            Be at least 16 years old (or the age of digital consent in your country, whichever
            is higher).
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="use" title="How you can use the service">
        <PlainEnglish>
          Use {BRAND_NAME} to run your business. Don&apos;t use it to break the law, hurt
          people, or steal data. Don&apos;t resell us as your own product.
        </PlainEnglish>
        <p>
          You may use {BRAND_NAME} for any lawful business or personal purpose. You may not:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Reverse-engineer, decompile, or copy material parts of the service to build a
            competing product.
          </li>
          <li>
            Use the platform to send spam, phish, distribute malware, or violate anyone&apos;s
            rights.
          </li>
          <li>
            Scrape the service, automate logins, or exfiltrate data at a scale clearly
            inconsistent with normal product use.
          </li>
          <li>
            Resell, sublicense, or white-label {BRAND_NAME} without a written agreement from
            us.
          </li>
          <li>
            Probe, scan, or stress-test the platform without our written authorization. See{" "}
            <Link href="/legal/security" className="text-blue-600 hover:underline">
              Security
            </Link>{" "}
            for the disclosure programme.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="subscription" title="Subscription & billing">
        <p>
          The current plans and prices are at{" "}
          <Link href="/#pricing" className="text-blue-600 hover:underline">
            {BRAND_DOMAIN}/#pricing
          </Link>
          . The Scaleup plan is {PRICING.currency}
          {PRICING.scaleupPriceInr} per seat per month. Enterprise pricing is bespoke.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Billing cycle:</strong> monthly or annual, depending on the plan you
            select.
          </li>
          <li>
            <strong>Currency:</strong> Indian Rupees (₹) by default. We may add other
            currencies for specific geographies.
          </li>
          <li>
            <strong>Taxes:</strong> prices are exclusive of GST/VAT/sales tax; we add them at
            checkout where required.
          </li>
          <li>
            <strong>Refunds:</strong> annual plans cancelled mid-term are refunded
            pro-rata for unused full months. Monthly plans aren&apos;t refunded after they
            renew.
          </li>
          <li>
            <strong>Payment failures:</strong> after two failed retries we notify the
            workspace owner and suspend non-essential features. Critical export functions stay
            available so you can leave with your data.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="free-trial" title="Free tier & trials">
        <p>
          The Startup plan is free for the first {PRICING.freeSeatLimit} seats — forever, no
          credit card. The Scaleup tier includes a 14-day free trial of all features. If you
          haven&apos;t entered payment details by trial end, the workspace automatically
          downgrades to the Startup plan. Nothing is auto-charged.
        </p>
      </LegalSection>

      <LegalSection id="your-content" title="Your content stays yours">
        <p>
          You retain all rights to the data, files, and content you put into {BRAND_NAME}. We
          don&apos;t claim ownership. We get only the licence necessary to operate the
          service: storing, transmitting, displaying it to authorized users in your workspace,
          and processing it for the features you&apos;ve enabled.
        </p>
        <p>
          On termination you have 60 days to export your content (JSON, CSV, and PDF where
          applicable). After 90 days from termination we permanently delete it.
        </p>
      </LegalSection>

      <LegalSection id="our-rights" title="Our rights">
        <p>
          We own the platform, the brand, the codebase, the design system, and the
          documentation. None of these terms transfer ownership of our IP to you. We grant you
          a limited, non-exclusive, non-transferable licence to use the service while your
          subscription is active.
        </p>
        <p>
          You may share aggregate, anonymous feedback with us. By doing so you grant us a
          perpetual, royalty-free licence to act on it — including building your suggestion
          into the product.
        </p>
      </LegalSection>

      <LegalSection id="beta" title="Beta features">
        <p>
          Features we mark as &ldquo;beta&rdquo;, &ldquo;preview&rdquo;, or
          &ldquo;experimental&rdquo; are provided as-is. They may be modified, withdrawn, or
          break in ways that production features won&apos;t. Don&apos;t build mission-critical
          workflows on them without checking with us first.
        </p>
      </LegalSection>

      <LegalSection id="uptime" title="Uptime & support">
        <p>
          We target <strong>99.9% monthly uptime</strong>. For the Scaleup plan we publish the
          actual uptime monthly. Enterprise customers get a contractual SLA with service
          credits.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Startup:</strong> community support, best-effort, no guaranteed response
            time.
          </li>
          <li>
            <strong>Scaleup:</strong> email support, response within one business day.
          </li>
          <li>
            <strong>Enterprise:</strong> dedicated CSM, priority queue, SLA.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="suspension" title="Suspension & termination">
        <p>
          We may suspend or terminate your access if you materially breach these terms — for
          example, if you use the platform to harm others, fail to pay after notice, or
          violate the security probing rules above. We&apos;ll give you advance notice and a
          chance to fix the issue unless the breach is severe (active attack, fraud, legal
          obligation).
        </p>
        <p>
          You can cancel any time from{" "}
          <span className="font-mono text-blue-600">Settings &rarr; Billing</span>. Effective
          at the end of the current billing period.
        </p>
      </LegalSection>

      <LegalSection id="disclaimer" title="Disclaimer of warranties">
        <p>
          The service is provided on an &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo;
          basis. To the maximum extent permitted by law, we disclaim all warranties — express,
          implied, statutory — including fitness for a particular purpose, merchantability,
          and non-infringement. Practically: we&apos;ll do our best, but software has bugs
          and infrastructure has outages.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, our aggregate liability for any claim
          arising out of or relating to these terms is capped at the greater of (a) the fees
          you paid us in the 12 months preceding the claim or (b) ₹10,000. We are not liable
          for indirect, incidental, consequential, or lost-profit damages.
        </p>
        <p>
          Nothing in these terms excludes liability for fraud, gross negligence, or anything
          that cannot legally be limited.
        </p>
      </LegalSection>

      <LegalSection id="indemnity" title="Indemnity">
        <p>
          You agree to indemnify and hold us harmless from claims arising out of (a) your
          content, (b) your use of the service in breach of these terms, or (c) your
          violation of someone else&apos;s rights.
        </p>
        <p>
          We&apos;ll defend you against third-party IP infringement claims relating to the
          platform itself, provided you notify us promptly and let us control the defence.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" title="Governing law">
        <p>
          These terms are governed by the laws of India. Disputes will be subject to the
          exclusive jurisdiction of the courts of Bengaluru, Karnataka — unless a mandatory
          consumer-protection law in your country says otherwise. For Enterprise customers,
          we&apos;re happy to negotiate alternative governing law and venue.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes">
        <p>
          We may update these terms. For material changes we&apos;ll email workspace owners
          at least 14 days before the changes take effect. Continued use after the effective
          date constitutes acceptance. If you don&apos;t accept, you can cancel without
          penalty before the effective date.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          Questions about these terms?{" "}
          <a href={`mailto:${BRAND_SUPPORT_EMAIL}`} className="font-mono text-blue-600 hover:underline">
            {BRAND_SUPPORT_EMAIL}
          </a>{" "}
          — a real person reads them.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
