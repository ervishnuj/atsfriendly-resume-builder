import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

export const CONTACT_CATEGORIES = [
  "Product Support",
  "Resume/ATS Questions",
  "Billing & Payments",
  "Feedback",
  "Bug Report",
  "Incorrect ATS Suggestion",
  "Resume Generation Help",
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

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    const request = getRequest();
    const { enforceContactRateLimit } = await import("./contact-security.server");
    await enforceContactRateLimit(request, data.email);
    const { getOptionalVerifiedUserId } = await import("./optional-auth.server");
    const userId = await getOptionalVerifiedUserId(request);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_messages").insert({
      user_id: userId,
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

    return { ok: true as const };
  });
