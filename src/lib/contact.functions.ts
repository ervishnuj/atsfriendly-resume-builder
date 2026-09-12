import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const CONTACT_CATEGORIES = [
  "Product Support",
  "Resume/ATS Questions",
  "Billing & Payments",
  "Feedback",
  "Bug Report",
  "Other",
] as const;

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email address").max(200),
  category: z.enum(CONTACT_CATEGORIES),
  subject: z.string().trim().min(3, "Please add a short subject").max(200),
  message: z.string().trim().min(20, "Please describe your question in a bit more detail").max(5000),
});

export type ContactInput = z.infer<typeof contactSchema>;

const EMAILJS_SERVICE_ID = "service_dio2t6k";
const EMAILJS_TEMPLATE_ID = "template_b9pp5sg";
const EMAILJS_PUBLIC_KEY = "j3MfrQ4vDm57Ojeb0";

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      category: data.category,
      subject: data.subject,
      message: data.message,
    });
    if (error) {
      console.error("contact_message_insert_failed", error.message);
      throw new Error("We could not save your message. Please try again in a moment.");
    }

    const emailResponse = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          from_name: data.name,
          from_email: data.email,
          reply_to: data.email,
          name: data.name,
          email: data.email,
          category: data.category,
          subject: data.subject,
          message: data.message,
        },
      }),
    });

    if (!emailResponse.ok) {
      const errorBody = await emailResponse.text();
      console.error(`emailjs_contact_send_failed [${emailResponse.status}]: ${errorBody}`);
      throw new Error(
        "Your message was saved, but the email notification could not be sent. Please try again later.",
      );
    }

    return { ok: true as const };
  });
