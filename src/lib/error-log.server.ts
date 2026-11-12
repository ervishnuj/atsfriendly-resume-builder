/**
 * Best-effort operational error log. Only categories, service names, short codes
 * and request IDs are stored — never resume text, job descriptions, emails or keys.
 */
export async function logAppError(entry: {
  category: string;
  service: string;
  code?: string | null;
  requestId?: string | null;
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("app_error_log").insert({
      category: entry.category.slice(0, 60),
      service: entry.service.slice(0, 60),
      code: entry.code ? entry.code.replace(/[^A-Za-z0-9_:-]/g, "").slice(0, 60) : null,
      request_id: entry.requestId ? entry.requestId.slice(0, 120) : null,
    });
  } catch {
    /* never block a user flow on logging */
  }
}
