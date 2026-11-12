import { z } from "zod";
import { APPLICATION_STATUSES } from "./applications-shared";

export const ANALYTICS_EVENTS = [
  "RESUME_CREATED",
  "JD_ANALYZED",
  "ATS_CHECK_COMPLETED",
  "RESUME_DOWNLOADED",
  "APPLICATION_CREATED",
  "APPLICATION_STATUS_UPDATED",
  "INTERVIEW_PREP_USED",
  "COVER_LETTER_GENERATED",
  "PAYMENT_STARTED",
  "PAYMENT_COMPLETED",
  "HOMEPAGE_VIEWED",
  "CHECKER_STARTED",
  "RESUME_UPLOADED",
  "RESUME_UPLOAD_FAILED",
  "SIGNUP_COMPLETED",
  "PRICING_VIEWED",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
const empty = z.object({}).strict();
const status = z.enum(APPLICATION_STATUSES);

export const AnalyticsPayloadSchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("RESUME_CREATED"), meta: empty.optional() }).strict(),
  z.object({ event: z.literal("JD_ANALYZED"), meta: empty.optional() }).strict(),
  z.object({ event: z.literal("ATS_CHECK_COMPLETED"), meta: empty.optional() }).strict(),
  z.object({ event: z.literal("RESUME_DOWNLOADED"), meta: empty.optional() }).strict(),
  z.object({ event: z.literal("APPLICATION_CREATED"), meta: z.object({ status }).strict() }).strict(),
  z.object({ event: z.literal("APPLICATION_STATUS_UPDATED"), meta: z.object({ from: status, to: status }).strict() }).strict(),
  z.object({ event: z.literal("INTERVIEW_PREP_USED"), meta: empty.optional() }).strict(),
  z.object({ event: z.literal("COVER_LETTER_GENERATED"), meta: empty.optional() }).strict(),
  z.object({ event: z.literal("PAYMENT_STARTED"), meta: empty.optional() }).strict(),
  z.object({ event: z.literal("PAYMENT_COMPLETED"), meta: empty.optional() }).strict(),
  z.object({ event: z.literal("HOMEPAGE_VIEWED"), meta: empty.optional() }).strict(),
  z.object({ event: z.literal("CHECKER_STARTED"), meta: empty.optional() }).strict(),
  z.object({ event: z.literal("RESUME_UPLOADED"), meta: z.object({ type: z.enum(["pdf", "docx", "other"]) }).strict() }).strict(),
  z.object({ event: z.literal("RESUME_UPLOAD_FAILED"), meta: z.object({ type: z.enum(["pdf", "docx", "other"]) }).strict() }).strict(),
  z.object({ event: z.literal("SIGNUP_COMPLETED"), meta: empty.optional() }).strict(),
  z.object({ event: z.literal("PRICING_VIEWED"), meta: empty.optional() }).strict(),
]);

/** Events that may be recorded without a signed-in user (no personal data). */
export const ANONYMOUS_EVENTS: ReadonlySet<AnalyticsEvent> = new Set<AnalyticsEvent>([
  "HOMEPAGE_VIEWED", "CHECKER_STARTED", "ATS_CHECK_COMPLETED", "RESUME_UPLOADED",
  "RESUME_UPLOAD_FAILED", "SIGNUP_COMPLETED", "PRICING_VIEWED",
]);

export type AnalyticsPayload = z.infer<typeof AnalyticsPayloadSchema>;