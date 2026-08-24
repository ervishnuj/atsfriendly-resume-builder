import { trackEvent } from "./analytics.functions";

/** Privacy-conscious product analytics: event names + coarse metadata only. */
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

/**
 * Fire-and-forget tracking. Never throws, never blocks the UI, and never
 * carries personal content (no names, JD text, or resume content).
 */
export function track(event: AnalyticsEvent, meta?: Record<string, unknown>): void {
  void trackEvent({ data: { event, meta } }).catch(() => undefined);
}
