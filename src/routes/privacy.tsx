import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicPage, PolicySection, Bullets } from "@/components/landing/PublicPage";

const TITLE = "Privacy Policy | TheResumeRocket";
const DESCRIPTION = "How TheResumeRocket collects, processes, stores and protects account, resume, job description, payment and usage information.";
const PAGE_URL = "https://theresumerocket.com/privacy";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE }, { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE }, { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" }, { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PublicPage title="Privacy Policy" intro="This policy explains what TheResumeRocket handles when you use the free ATS Checker, create an account, build a resume, or make a payment. Last updated: 10 September 2026.">
      <PolicySection heading="1. Information We Collect">
        <Bullets items={[
          "Account information: your email address and authentication records when you register or sign in.",
          "Profile and resume information: the personal details, skills, projects, education and experience you choose to enter or import.",
          "Job application information: job descriptions, company and role details, application status, notes and generated resume versions.",
          "Payment information: plan, amount, payment status, UPI reference and verification notes. We do not ask for or store card numbers.",
          "Service information: feature-use events, generation request status, timestamps and technical error information needed to operate and improve the service.",
          "Contact information: the name, email, category, subject and message you submit through our Contact page.",
        ]} />
      </PolicySection>
      <PolicySection heading="2. How We Use Information">
        <p>We use information to authenticate accounts, save your work, compare resumes with job descriptions, generate tailored content, enforce plan limits, process and verify payments, respond to support requests, diagnose errors and understand aggregate product usage.</p>
      </PolicySection>
      <PolicySection heading="3. Resume and Profile Data">
        <p>The public Free ATS Checker processes pasted text and uploaded PDF or DOCX files in your browser. That checker does not send the resume or job description to our database or AI service.</p>
        <p>The signed-in Resume Builder is different. Profile information saved to your account is encrypted before database storage. Generated resume versions, target job descriptions, template settings and application-tracker entries may be stored so the authenticated features work across sessions. Some unsaved form state may also be held in your browser's local storage for convenience.</p>
      </PolicySection>
      <PolicySection heading="4. AI Processing">
        <p>When you use AI analysis or resume generation, the profile and job-description content required for that request is sent through our server to Google Gemini. It is used to produce the requested analysis or resume. The deterministic ATS score itself is calculated by TheResumeRocket's rule-based scoring logic.</p>
      </PolicySection>
      <PolicySection heading="5. Payments">
        <p>Current purchases use UPI. We store the transaction reference you submit, the selected plan, amount, currency, verification status and related timestamps. The UPI provider and your bank process the payment itself under their own terms.</p>
      </PolicySection>
      <PolicySection heading="6. Analytics and Cookies">
        <p>We record limited product events, such as feature use, with an account identifier when available and basic event details. Authentication uses browser storage and may use session cookies to keep you signed in. We do not describe these records as advertising profiles, and the current application does not include third-party advertising trackers.</p>
      </PolicySection>
      <PolicySection heading="7. Third-Party Services">
        <Bullets items={[
          "Lovable Cloud provides authentication, database, storage and server infrastructure.",
          "Google Gemini processes content submitted to authenticated AI features.",
          "UPI providers and banks process payments outside TheResumeRocket.",
          "Google Search Console helps monitor how public pages appear in search; it does not receive your resume content from us.",
        ]} />
      </PolicySection>
      <PolicySection heading="8. Data Storage and Security">
        <p>Account data is stored in the application's managed backend with access controls that separate each user's records. Sensitive profile fields are encrypted before storage. Administrative payment and support views require server-verified administrator access. No system is completely risk-free, so users should avoid entering information that is not needed for a resume.</p>
      </PolicySection>
      <PolicySection heading="9. Data Retention">
        <p>Account, profile, generated resume, application and payment records are retained while needed to provide the service, document purchases, prevent abuse and meet operational obligations. The current product does not offer an automated retention schedule or self-service account-deletion control. Contact us to request review or deletion of eligible account data.</p>
      </PolicySection>
      <PolicySection heading="10. Your Choices and Rights">
        <p>You can choose what profile and job information to provide, edit saved information, use the browser-only ATS Checker without an account, clear local browser storage, and contact us to request access, correction or deletion where applicable. Some transaction or security records may need to be retained.</p>
      </PolicySection>
      <PolicySection heading="11. Children's Privacy">
        <p>TheResumeRocket is intended for people preparing job applications and is not directed to children. Do not use the service if you are not legally able to agree to these terms in your location.</p>
      </PolicySection>
      <PolicySection heading="12. Changes to This Policy">
        <p>We may update this policy when the service or its data handling changes. The current version and update date will be posted on this page.</p>
      </PolicySection>
      <PolicySection heading="13. Contact">
        <p>Questions or privacy requests can be sent through the <Link to="/contact" className="underline underline-offset-4">Contact TheResumeRocket</Link> page. We do not publish an email address that is not configured for this service.</p>
      </PolicySection>
    </PublicPage>
  );
}