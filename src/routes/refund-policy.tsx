import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicPage, PolicySection, Bullets } from "@/components/landing/PublicPage";

const TITLE = "Refund Policy | TheResumeRocket";
const DESCRIPTION = "How TheResumeRocket reviews duplicate UPI payments, failed access activation and refund requests for one-time purchases.";
const PAGE_URL = "https://theresumerocket.com/refund-policy";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESCRIPTION }, { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION }, { property: "og:type", content: "website" },
    { property: "og:url", content: PAGE_URL }, { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: PAGE_URL }] }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return (
    <PublicPage title="Refund Policy" intro="TheResumeRocket plans are one-time UPI purchases. This page explains how payment problems and refund requests are handled without promising an unsupported refund window. Last updated: 10 September 2026.">
      <PolicySection heading="Eligible situations"><p>Refund requests are reviewed case by case. A refund may be appropriate when:</p><Bullets items={[
        "The same purchase was paid more than once and the duplicate can be verified.",
        "A payment was successfully received and verified, but the purchased access or credit was never activated because of a technical failure.",
        "The payment was assigned to the wrong status or plan and the issue cannot reasonably be corrected by activating the intended purchase.",
      ]} /></PolicySection>
      <PolicySection heading="Situations that are generally not refundable"><Bullets items={[
        "A credit has already been used to generate or export a resume.",
        "A time-limited pass has been activated and used.",
        "You changed your mind after the purchased digital service was delivered.",
        "A resume did not produce an interview, job offer or particular ATS result. TheResumeRocket does not guarantee hiring outcomes.",
        "Incorrect payment details or an invalid transaction reference were submitted and no payment to TheResumeRocket can be verified.",
      ]} /></PolicySection>
      <PolicySection heading="Failed or pending payments"><p>A pending UPI payment does not activate access until its transaction reference is verified. If your bank shows a debit but the app shows pending or failed, do not pay again immediately. Send the transaction details through the Contact page so the existing payment can be checked.</p></PolicySection>
      <PolicySection heading="How to request a review"><p>Use the <Link to="/contact" className="underline underline-offset-4">Contact TheResumeRocket</Link> form and choose “Billing &amp; Payments.” Include:</p><Bullets items={[
        "The email address used for your TheResumeRocket account.",
        "The purchased plan and amount.",
        "The UPI transaction reference submitted in the app.",
        "The payment date and a short explanation of the problem.",
        "For a duplicate payment, both transaction references.",
      ]} /></PolicySection>
      <PolicySection heading="Review and processing"><p>The team will verify the payment record, entitlement status and any usage before deciding the request. The current payment system supports marking verified payments as refunded, but the application does not publish a fixed review or bank-processing timeline. If approved, the return time depends on the UPI provider and banks involved. Refunded access is no longer active.</p></PolicySection>
      <PolicySection heading="Technical problems"><p>If a download or generation fails, contact us before purchasing again. Where possible, we will first correct the failed delivery or restore the appropriate access rather than require a second payment.</p></PolicySection>
    </PublicPage>
  );
}