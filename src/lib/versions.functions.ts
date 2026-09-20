import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { OptimizedResume } from "./resume-schemas";
import type { TemplateConfig } from "./resume-templates";
import { decryptScopedJson, encryptScopedJson } from "./profile-crypto.server";

export type ResumeVersion = {
  id: string;
  company: string;
  jobTitle: string;
  jobDescription: string;
  atsScore: number | null;
  matchScore: number | null;
  templateId: string;
  version: number;
  resume: OptimizedResume;
  templateConfig: TemplateConfig | null;
  createdAt: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapVersionRow(row: any, userId: string): ResumeVersion {
  const payload = (decryptScopedJson(
    row.encrypted_resume_payload ?? null,
    `resume-version:${userId}`,
  ) ?? row.resume_json ?? {}) as {
    resume?: OptimizedResume;
    templateConfig?: TemplateConfig | null;
  };
  return {
    id: row.id,
    company: row.company ?? "",
    jobTitle: row.job_title ?? "",
    jobDescription:
      decryptScopedJson<string>(
        row.encrypted_job_description ?? null,
        `resume-version-jd:${userId}`,
      ) ?? row.job_description ?? "",
    atsScore: row.ats_score ?? null,
    matchScore: row.match_score ?? null,
    templateId: row.template_id ?? "ats-classic",
    version: row.version ?? 1,
    resume: (payload.resume ?? payload) as OptimizedResume,
    templateConfig: payload.templateConfig ?? null,
    createdAt: row.created_at,
  };
}

const saveInput = z.object({
  company: z.string().max(200).default(""),
  jobTitle: z.string().max(200).default(""),
  jobDescription: z.string().max(30000).default(""),
  atsScore: z.number().int().min(0).max(100).nullable().optional(),
  matchScore: z.number().int().min(0).max(100).nullable().optional(),
  templateId: z.string().max(120).default("ats-classic"),
  resume: z.unknown().refine((value) => JSON.stringify(value).length <= 150000, "Resume is too large"),
  templateConfig: z.unknown().optional().refine((value) => JSON.stringify(value ?? null).length <= 30000, "Template settings are too large"),
});

/** Saves a generated job-specific resume. Version increments per company + job title. */
export const saveResumeVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveInput.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string; version: number }> => {
    const payload = { resume: data.resume as OptimizedResume, templateConfig: data.templateConfig ?? null };
    const { data: existing } = await context.supabase
      .from("resume_versions")
      .select("version")
      .eq("user_id", context.userId)
      .eq("company", data.company)
      .eq("job_title", data.jobTitle)
      .order("version", { ascending: false })
      .limit(1);
    const version = ((existing?.[0]?.version as number | undefined) ?? 0) + 1;
    const { data: row, error } = await context.supabase
      .from("resume_versions")
      .insert({
        user_id: context.userId,
        company: data.company,
        job_title: data.jobTitle,
        job_description: "",
        encrypted_job_description: encryptScopedJson(
          data.jobDescription,
          `resume-version-jd:${context.userId}`,
        ),
        ats_score: data.atsScore ?? null,
        match_score: data.matchScore ?? null,
        template_id: data.templateId,
        version,
        resume_json: {},
        encrypted_resume_payload: encryptScopedJson(payload, `resume-version:${context.userId}`),
      })
      .select("id, version")
      .single();
    if (error) throw new Error("Could not save the resume version.");
    return { id: row.id as string, version: row.version as number };
  });

export const listResumeVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ResumeVersion[]> => {
    const { data, error } = await context.supabase
      .from("resume_versions")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("Could not load your resume versions.");
    const versions = (data ?? []).map((row) => mapVersionRow(row, context.userId));
    await Promise.all(
      (data ?? []).map(async (row, index) => {
        if (row.encrypted_resume_payload && row.encrypted_job_description) return;
        const version = versions[index];
        if (!version) return;
        await context.supabase
          .from("resume_versions")
          .update({
            resume_json: {},
            job_description: "",
            encrypted_resume_payload: encryptScopedJson(
              { resume: version.resume, templateConfig: version.templateConfig },
              `resume-version:${context.userId}`,
            ),
            encrypted_job_description: encryptScopedJson(
              version.jobDescription,
              `resume-version-jd:${context.userId}`,
            ),
          })
          .eq("id", version.id)
          .eq("user_id", context.userId);
      }),
    );
    return versions;
  });

export const updateResumeVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        company: z.string().max(200).optional(),
        jobTitle: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const patch = {
      ...(data.company !== undefined ? { company: data.company } : {}),
      ...(data.jobTitle !== undefined ? { job_title: data.jobTitle } : {}),
    };
    const { error } = await context.supabase
      .from("resume_versions")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not update the resume version.");
    return { ok: true };
  });

export const duplicateResumeVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ id: string; version: number }> => {
    const { data: source, error: readError } = await context.supabase
      .from("resume_versions")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (readError || !source) throw new Error("Resume version not found.");
    const sourceVersion = mapVersionRow(source, context.userId);
    const { data: existing } = await context.supabase
      .from("resume_versions")
      .select("version")
      .eq("user_id", context.userId)
      .eq("company", source.company)
      .eq("job_title", source.job_title)
      .order("version", { ascending: false })
      .limit(1);
    const version = ((existing?.[0]?.version as number | undefined) ?? 0) + 1;
    const { data: row, error } = await context.supabase
      .from("resume_versions")
      .insert({
        user_id: context.userId,
        company: source.company,
        job_title: source.job_title,
        job_description: "",
        encrypted_job_description: encryptScopedJson(
          sourceVersion.jobDescription,
          `resume-version-jd:${context.userId}`,
        ),
        ats_score: source.ats_score,
        match_score: source.match_score,
        template_id: source.template_id,
        version,
        resume_json: {},
        encrypted_resume_payload: encryptScopedJson(
          { resume: sourceVersion.resume, templateConfig: sourceVersion.templateConfig },
          `resume-version:${context.userId}`,
        ),
      })
      .select("id, version")
      .single();
    if (error) throw new Error("Could not duplicate the resume version.");
    return { id: row.id as string, version: row.version as number };
  });

export const deleteResumeVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("resume_versions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not delete the resume version.");
    return { ok: true };
  });
