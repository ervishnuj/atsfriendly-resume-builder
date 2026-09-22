import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const clearMyAiResultHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("ai_generation_requests")
      .update({ result: null, result_deleted_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not delete your stored AI results.");
    return { ok: true };
  });

export const deleteMySavedResumeVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("resume_versions")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not delete your saved resume versions.");
    return { ok: true };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("delete_user_account", { _user_id: context.userId });
    if (error) throw new Error("Your account could not be deleted. Please try again.");
    return { ok: true };
  });