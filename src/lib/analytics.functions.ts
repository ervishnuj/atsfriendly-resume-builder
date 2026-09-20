import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AnalyticsPayloadSchema } from "./analytics-schemas";

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
