import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PublicPage, PolicySection } from "@/components/landing/PublicPage";
import { CONTACT_CATEGORIES, submitContactMessage } from "@/lib/contact.functions";
import { CheckCircle2 } from "lucide-react";

const TITLE = "Contact TheResumeRocket";
const DESCRIPTION =
  "Questions about your ATS score, resume generation, billing or a bug? Send the TheResumeRocket team a message and we'll get back to you.";
const PAGE_URL = "https://theresumerocket.com/contact";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const send = useServerFn(submitContactMessage);
  const [form, setForm] = useState({
    name: "",
    email: "",
    category: CONTACT_CATEGORIES[0] as string,
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("sending");
    try {
      await send({ data: form as never });
      setStatus("sent");
      setForm({ name: "", email: "", category: CONTACT_CATEGORIES[0], subject: "", message: "" });
    } catch (err) {
      setStatus("idle");
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Please check the form and try again.",
      );
    }
  }

  return (
    <PublicPage
      title="Contact TheResumeRocket"
      intro="Have a question, feedback, or need help? We'd love to hear from you."
    >
      <PolicySection heading="What we can help with">
        <p>
          Pick the closest category below so your message reaches the right place. For payment
          questions, include the UPI transaction reference you submitted — it makes verification much
          faster. Messages are stored in the app and reviewed by the team; replies come to the email
          address you enter here.
        </p>
      </PolicySection>

      <Card className="p-5 sm:p-6">
        {status === "sent" ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-brand" />
              <div>
                <h2 className="text-lg font-semibold">Message received</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Thanks — your message has been saved and the team will review it. We'll reply to
                  the email address you provided.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setStatus("idle")}>
              Send another message
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">Name</Label>
                <Input
                  id="contact-name"
                  value={form.name}
                  required
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={form.email}
                  required
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-category">Category</Label>
              <select
                id="contact-category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CONTACT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-subject">Subject</Label>
              <Input
                id="contact-subject"
                value={form.subject}
                required
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                rows={7}
                value={form.message}
                required
                placeholder="Tell us what happened, what you expected, and any reference numbers."
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Submit"}
            </Button>
          </form>
        )}
      </Card>

      <PolicySection heading="Before you write">
        <p>
          Many questions are already answered on the{" "}
          <Link to="/faq" className="underline underline-offset-4">
            FAQ
          </Link>
          , the{" "}
          <Link to="/how-it-works" className="underline underline-offset-4">
            step-by-step walkthrough
          </Link>
          , the{" "}
          <Link to="/refund-policy" className="underline underline-offset-4">
            Refund Policy
          </Link>{" "}
          and the{" "}
          <Link to="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      </PolicySection>
    </PublicPage>
  );
}
