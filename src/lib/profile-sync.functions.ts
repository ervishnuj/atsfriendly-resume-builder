import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Profile } from "@/components/ProfileForm";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { decryptJson } = await import("./profile-crypto.server");
    const { data, error } = await context.supabase
      .from("profiles")
      .select("encrypted_personal_info, encrypted_skills, encrypted_projects, encrypted_education")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const personal = decryptJson<Profile["personal"]>(data.encrypted_personal_info);
    const skills = decryptJson<Profile["skills"]>(data.encrypted_skills);
    const experience = decryptJson<Profile["experience"]>(data.encrypted_projects);
    const education = decryptJson<Profile["education"]>(data.encrypted_education);
    if (!personal && !skills && !experience && !education) return null;
    return { personal, skills, experience, education };
  });

export const saveMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { profile: Profile }) => data)
  .handler(async ({ data, context }) => {
    const { encryptJson } = await import("./profile-crypto.server");
    const { profile } = data;
    const { error } = await context.supabase.from("profiles").upsert(
      {
        user_id: context.userId,
        encrypted_personal_info: encryptJson(profile.personal),
        encrypted_skills: encryptJson(profile.skills),
        encrypted_projects: encryptJson(profile.experience),
        encrypted_education: encryptJson(profile.education),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
