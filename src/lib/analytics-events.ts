import { trackEvent } from "./analytics.functions";
import type { AnalyticsEvent, AnalyticsPayload } from "./analytics-schemas";
export { ANALYTICS_EVENTS } from "./analytics-schemas";

/** Privacy-conscious product analytics: event names + coarse metadata only. */
/**
 * Fire-and-forget tracking. Never throws, never blocks the UI, and never
 * carries personal content (no names, JD text, or resume content).
 */
export function track(event: AnalyticsEvent, meta?: Record<string, unknown>): void {
  const payload = { event, ...(meta ? { meta } : {}) } as AnalyticsPayload;
  void trackEvent({ data: payload }).catch(() => undefined);
}
