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
]);

export type AnalyticsPayload = z.infer<typeof AnalyticsPayloadSchema>;