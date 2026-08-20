import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeConfig, type TemplateConfig } from "./resume-templates";

export type SavedTemplate = {
  id: string;
  name: string;
  config: TemplateConfig;
  updatedAt: string;
};

/** Templates are always scoped to the authenticated identity — never a client id. */
export const listMyTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedTemplate[]> => {
    const { data, error } = await context.supabase
      .from("resume_templates")
      .select("id, name, config, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      config: normalizeConfig(r.config),
      updatedAt: r.updated_at as string,
    }));
  });

export const saveMyTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string | null; name: string; config: TemplateConfig }) => d)
  .handler(async ({ data, context }): Promise<SavedTemplate> => {
    const name = data.name.trim().slice(0, 80);
    if (!name) throw new Error("Please enter a template name.");
    const config = normalizeConfig({ ...data.config, templateName: name });
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("resume_templates")
        .update({ name, config })
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .select("id, name, config, updated_at")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id, name: row.name, config: normalizeConfig(row.config), updatedAt: row.updated_at };
    }
    const { data: row, error } = await context.supabase
      .from("resume_templates")
      .insert({ user_id: context.userId, name, config })
      .select("id, name, config, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, name: row.name, config: normalizeConfig(row.config), updatedAt: row.updated_at };
  });

export const deleteMyTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("resume_templates")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
