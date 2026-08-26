import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  APPLICATION_STATUSES,
  mapApplicationRow,
  type JobApplication,
} from "./applications-shared";

export type { JobApplication } from "./applications-shared";

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
  jobUrl: z.string().max(500).default(""),
  location: z.string().max(200).default(""),
  salary: z.string().max(100).default(""),
  status: z.enum(APPLICATION_STATUSES).default("SAVED"),
  notes: z.string().max(5000).default(""),
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
    return (data ?? []).map(mapApplicationRow);
  });

export const createJobApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }): Promise<JobApplication> => {
    const { data: row, error } = await context.supabase
      .from("job_applications")
      .insert({
        user_id: context.userId,
        company: data.company,
        job_title: data.jobTitle,
        job_description: data.jobDescription,
        applied_at: data.appliedAt ?? null,
        resume_version_id: data.resumeVersionId ?? null,
        job_url: data.jobUrl,
        location: data.location,
        salary: data.salary,
        status: data.status,
        notes: data.notes,
      })
      .select("*")
      .single();
    if (error) throw new Error("Could not save the application.");
    return mapApplicationRow(row);
  });

export const updateJobApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), updates: inputSchema.partial() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<JobApplication> => {
    const u = data.updates;
    const patch = {
      ...(u.company !== undefined ? { company: u.company } : {}),
      ...(u.jobTitle !== undefined ? { job_title: u.jobTitle } : {}),
      ...(u.jobDescription !== undefined ? { job_description: u.jobDescription } : {}),
      ...(u.appliedAt !== undefined ? { applied_at: u.appliedAt } : {}),
      ...(u.resumeVersionId !== undefined ? { resume_version_id: u.resumeVersionId } : {}),
      ...(u.jobUrl !== undefined ? { job_url: u.jobUrl } : {}),
      ...(u.location !== undefined ? { location: u.location } : {}),
      ...(u.salary !== undefined ? { salary: u.salary } : {}),
      ...(u.status !== undefined ? { status: u.status } : {}),
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
    return mapApplicationRow(row);
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
