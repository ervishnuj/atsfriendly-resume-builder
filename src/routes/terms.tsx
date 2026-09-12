import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicPage, PolicySection, Bullets } from "@/components/landing/PublicPage";

const TITLE = "Terms of Service | TheResumeRocket";
const DESCRIPTION = "Terms for using TheResumeRocket's ATS checker, resume builder, AI analysis, templates, exports, tracker and paid passes.";
const PAGE_URL = "https://theresumerocket.com/terms";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESCRIPTION }, { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION }, { property: "og:type", content: "website" },
    { property: "og:url", content: PAGE_URL }, { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: PAGE_URL }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PublicPage title="Terms of Service" intro="These terms govern your use of TheResumeRocket. By creating an account, using a paid feature, or continuing to use the service, you agree to them. Last updated: 10 September 2026.">
      <PolicySection heading="1. Acceptance of Terms"><p>If you do not agree to these terms, do not use the service. You must be legally able to enter this agreement in your location.</p></PolicySection>
      <PolicySection heading="2. Description of Service"><p>TheResumeRocket provides a browser-based ATS checker, profile and resume tools, job-description matching, skill-gap analysis, AI-assisted resume generation, ATS-friendly templates, PDF and DOCX export, and an application tracker. Features and limits depend on the plan shown at purchase.</p></PolicySection>
      <PolicySection heading="3. User Accounts"><p>You are responsible for providing accurate registration information, keeping access to your email and account secure, and all activity under your account. Do not share, sell or misuse an account or attempt to bypass usage limits.</p></PolicySection>
      <PolicySection heading="4. User Responsibilities"><Bullets items={[
        "Use the service lawfully and only for genuine career and job-application purposes.",
        "Review every result before relying on, sharing or submitting it.",
        "Keep your profile, experience, qualifications and contact details truthful and current.",
        "Respect employers' application instructions and applicable laws.",
      ]} /></PolicySection>
      <PolicySection heading="5. Resume and User Content"><p>You retain responsibility for content you enter or upload. You give TheResumeRocket permission to process and store that content only as needed to provide, secure and improve the service. Do not submit confidential information you lack permission to use.</p></PolicySection>
      <PolicySection heading="6. AI-Generated Content"><p>AI output may be incomplete, inaccurate or awkward. It is a draft, not professional, legal or employment advice. You must verify all output. Never add fake skills, fake experience, fake achievements, fabricated metrics or any other untrue information to an application.</p></PolicySection>
      <PolicySection heading="7. Accuracy and Verification"><p>ATS scores and analyses are guidance based on the supplied text and TheResumeRocket's rules. Employer systems differ. We do not guarantee ATS acceptance, interviews, offers, hiring outcomes or any particular improvement in results.</p></PolicySection>
      <PolicySection heading="8. Payments and Subscriptions"><p>Current plans are one-time purchases, not automatic recurring subscriptions. Access, duration and credits are those displayed at checkout. UPI payments may require verification before access is activated. See the <Link to="/refund-policy" className="underline underline-offset-4">Refund Policy</Link> for refund handling.</p></PolicySection>
      <PolicySection heading="9. Prohibited Use"><Bullets items={[
        "Attempting to access another user's records or administrative functions.",
        "Automated scraping, excessive requests, interference with security controls or reverse engineering intended to abuse the service.",
        "Submitting malicious files, unlawful material or content that infringes another person's rights.",
        "Using generated content to deceive an employer about your identity, skills, experience or achievements.",
      ]} /></PolicySection>
      <PolicySection heading="10. Intellectual Property"><p>The service, interface, scoring logic, written guidance and brand are protected by applicable intellectual-property laws. Your underlying resume facts and content remain yours. These terms do not transfer ownership of the service to you.</p></PolicySection>
      <PolicySection heading="11. Third-Party Services"><p>The service depends on managed cloud infrastructure, Google Gemini and UPI payment services. Their availability and processing may be governed by their own terms and policies.</p></PolicySection>
      <PolicySection heading="12. Service Availability"><p>We aim to keep the service available but cannot promise uninterrupted or error-free operation. Features may be paused, corrected or changed for security, maintenance, legal or product reasons.</p></PolicySection>
      <PolicySection heading="13. Limitation of Liability"><p>To the extent permitted by law, TheResumeRocket is not liable for hiring decisions, missed opportunities, employer-system behavior, user-entered inaccuracies, or indirect losses arising from use of the service. Rights that cannot legally be excluded remain unaffected.</p></PolicySection>
      <PolicySection heading="14. Changes to Service"><p>We may add, change or discontinue features. Material changes affecting a paid purchase will be handled reasonably and in line with the purchase shown when it was made.</p></PolicySection>
      <PolicySection heading="15. Changes to Terms"><p>Updated terms will be posted here with a revised date. Continued use after an update means you accept the revised terms.</p></PolicySection>
      <PolicySection heading="16. Contact"><p>Questions about these terms can be submitted through the <Link to="/contact" className="underline underline-offset-4">Contact page</Link>.</p></PolicySection>
    </PublicPage>
  );
}