import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AnalyticsPayloadSchema, ANONYMOUS_EVENTS } from "./analytics-schemas";

/**
 * Analytics ingestion. Best-effort by design: failures are swallowed so a
 * tracking problem can never break a user workflow.
 */
export const trackEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyticsPayloadSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    try {
      const { error } = await context.supabase
        .from("analytics_events")
        .insert({ user_id: context.userId, event: data.event, meta: data.meta ?? {} });
      return { ok: !error };
    } catch {
      return { ok: false };
    }
  });

/**
 * Public ingestion for a fixed set of content-free funnel events. Links the
 * signed-in user when a valid session is sent; throttled per visitor.
 */
export const trackPublicEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyticsPayloadSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      const request = getRequest();
      const { getOptionalVerifiedUserId } = await import("./optional-auth.server");
      const userId = await getOptionalVerifiedUserId(request).catch(() => null);
      if (!userId && !ANONYMOUS_EVENTS.has(data.event)) return { ok: false };
      const { consumeVisitorLimit } = await import("./abuse.server");
      if (!(await consumeVisitorLimit(request, "analytics", 900, 120, 1000))) { console.warn("analytics_throttled"); return { ok: false }; }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("analytics_events")
        .insert({ user_id: userId, event: data.event, meta: data.meta ?? {} });
      if (error) console.warn("analytics_insert_failed", error.code);
      return { ok: !error };
    } catch (e) {
      console.warn("analytics_failed", e instanceof Error ? e.message : "unknown");
      return { ok: false };
    }
  });
