import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  APPLICATION_PLATFORMS,
  APPLICATION_STATUSES,
  mapApplicationRow,
  type JobApplication,
} from "./applications-shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { decryptScopedJson, encryptScopedJson } from "./profile-crypto.server";

export type { JobApplication } from "./applications-shared";

function mapProtectedApplication(row: unknown, userId: string): JobApplication {
  const mapped = mapApplicationRow(row);
  const encrypted = (row as { encrypted_job_description?: string | null }).encrypted_job_description;
  return {
    ...mapped,
    jobDescription:
      decryptScopedJson<string>(encrypted ?? null, `job-application-jd:${userId}`) ??
      mapped.jobDescription,
  };
}

async function assertOwnedResumeVersion(
  supabase: SupabaseClient<Database>,
  userId: string,
  resumeVersionId: string | null | undefined,
): Promise<void> {
  if (!resumeVersionId) return;
  const { data, error } = await supabase
    .from("resume_versions")
    .select("id")
    .eq("id", resumeVersionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) throw new Error("The selected resume version is not available.");
}

const inputSchema = z.object({
  company: z.string().max(200).default(""),
  jobTitle: z.string().min(1, "Job title is required").max(200),
  jobDescription: z.string().max(30000).default(""),
  appliedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  resumeVersionId: z.string().uuid().nullable().optional(),
  jobUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Job URL must start with http:// or https://")
    .default(""),
  platform: z.union([z.enum(APPLICATION_PLATFORMS), z.literal("")]).default(""),
  customPlatform: z.string().trim().max(120).default(""),
  location: z.string().max(200).default(""),
  salary: z.string().max(100).default(""),
  status: z.enum(APPLICATION_STATUSES).default("SAVED"),
  notes: z.string().max(5000).default(""),
});

const createSchema = inputSchema.extend({
  /** Per-save idempotency key so repeated clicks never create duplicates. */
  clientRequestId: z.string().min(8).max(100).optional(),
});

export const listJobApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<JobApplication[]> => {
    const { data, error } = await context.supabase
      .from("job_applications")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("Could not load your applications.");
    const applications = (data ?? []).map((row) => mapProtectedApplication(row, context.userId));
    await Promise.all(
      (data ?? []).map(async (row, index) => {
        if (row.encrypted_job_description) return;
        const application = applications[index];
        if (!application) return;
        await context.supabase
          .from("job_applications")
          .update({
            job_description: "",
            encrypted_job_description: encryptScopedJson(
              application.jobDescription,
              `job-application-jd:${context.userId}`,
            ),
          })
          .eq("id", application.id)
          .eq("user_id", context.userId);
      }),
    );
    return applications;
  });

export const createJobApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }): Promise<JobApplication> => {
    await assertOwnedResumeVersion(context.supabase, context.userId, data.resumeVersionId);
    if (data.clientRequestId) {
      const { data: existing } = await context.supabase
        .from("job_applications")
        .select("*")
        .eq("user_id", context.userId)
        .eq("client_request_id", data.clientRequestId)
        .maybeSingle();
      if (existing) return mapProtectedApplication(existing, context.userId);
    }
    const { data: row, error } = await context.supabase
      .from("job_applications")
      .insert({
        user_id: context.userId,
        company: data.company,
        job_title: data.jobTitle,
        job_description: "",
        encrypted_job_description: encryptScopedJson(
          data.jobDescription,
          `job-application-jd:${context.userId}`,
        ),
        applied_at: data.appliedAt ?? null,
        resume_version_id: data.resumeVersionId ?? null,
        job_url: data.jobUrl,
        location: data.location,
        salary: data.salary,
        status: data.status,
        platform: data.platform,
        custom_platform: data.customPlatform,
        client_request_id: data.clientRequestId ?? null,
        notes: data.notes,
      })
      .select("*")
      .single();
    if (error?.code === "23505" && data.clientRequestId) {
      const { data: existing } = await context.supabase
        .from("job_applications")
        .select("*")
        .eq("user_id", context.userId)
        .eq("client_request_id", data.clientRequestId)
        .single();
      if (existing) return mapProtectedApplication(existing, context.userId);
    }
    if (error || !row) throw new Error("Could not save the application.");
    return mapProtectedApplication(row, context.userId);
  });

export const updateJobApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), updates: inputSchema.partial() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<JobApplication> => {
    const u = data.updates;
    if (u.resumeVersionId !== undefined) {
      await assertOwnedResumeVersion(context.supabase, context.userId, u.resumeVersionId);
    }
    const patch = {
      ...(u.company !== undefined ? { company: u.company } : {}),
      ...(u.jobTitle !== undefined ? { job_title: u.jobTitle } : {}),
      ...(u.jobDescription !== undefined
        ? {
            job_description: "",
            encrypted_job_description: encryptScopedJson(
              u.jobDescription,
              `job-application-jd:${context.userId}`,
            ),
          }
        : {}),
      ...(u.appliedAt !== undefined ? { applied_at: u.appliedAt } : {}),
      ...(u.resumeVersionId !== undefined ? { resume_version_id: u.resumeVersionId } : {}),
      ...(u.jobUrl !== undefined ? { job_url: u.jobUrl } : {}),
      ...(u.location !== undefined ? { location: u.location } : {}),
      ...(u.salary !== undefined ? { salary: u.salary } : {}),
      ...(u.status !== undefined ? { status: u.status } : {}),
      ...(u.platform !== undefined ? { platform: u.platform } : {}),
      ...(u.customPlatform !== undefined ? { custom_platform: u.customPlatform } : {}),
      ...(u.notes !== undefined ? { notes: u.notes } : {}),
    };
    const { data: row, error } = await context.supabase
      .from("job_applications")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw new Error("Could not update the application.");
    return mapProtectedApplication(row, context.userId);
  });

export const deleteJobApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("job_applications")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not delete the application.");
    return { ok: true };
  });
