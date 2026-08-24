import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ANALYTICS_EVENTS } from "./analytics-events";

/**
 * Analytics ingestion. Best-effort by design: failures are swallowed so a
 * tracking problem can never break a user workflow.
 */
export const trackEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        event: z.enum(ANALYTICS_EVENTS),
        meta: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    try {
      // Coarse metadata only — cap the payload so no personal content is stored.
      const meta = JSON.parse(JSON.stringify(data.meta ?? {})) as Record<string, unknown>;
      const safeMeta = JSON.stringify(meta).length <= 2000 ? meta : {};
      const { error } = await context.supabase
        .from("analytics_events")
        .insert({ user_id: context.userId, event: data.event, meta: safeMeta });
      return { ok: !error };
    } catch {
      return { ok: false };
    }
  });
