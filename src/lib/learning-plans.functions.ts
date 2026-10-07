import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MilestoneSchema, defaultMilestones, type LearningPlan, type Milestone } from "./learning-plan";

type Row = { id: string; job_title: string; skill: string; priority: string; why: string; milestones: unknown; updated_at: string };
const toPlan = (r: Row): LearningPlan => ({
  id: r.id, jobTitle: r.job_title, skill: r.skill, priority: r.priority, why: r.why,
  milestones: z.array(MilestoneSchema).catch([]).parse(r.milestones) as Milestone[], updatedAt: r.updated_at,
});
const COLS = "id, job_title, skill, priority, why, milestones, updated_at";

export const listLearningPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LearningPlan[]> => {
    const { data, error } = await context.supabase.from("learning_plans").select(COLS)
      .eq("user_id", context.userId).order("created_at", { ascending: true });
    if (error) throw new Error("Could not load your learning plan.");
    return (data as Row[]).map(toPlan);
  });

export const addLearningPlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    jobTitle: z.string().max(200).default(""),
    items: z.array(z.object({ skill: z.string().trim().min(1).max(120), priority: z.enum(["High", "Medium"]), why: z.string().max(400) })).min(1).max(30),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase.from("learning_plans").select("skill").eq("user_id", context.userId);
    const have = new Set((existing ?? []).map((r) => r.skill.toLowerCase()));
    const rows = data.items.filter((i) => !have.has(i.skill.toLowerCase())).map((i) => ({
      user_id: context.userId, job_title: data.jobTitle, skill: i.skill, priority: i.priority, why: i.why, milestones: defaultMilestones(i.skill),
    }));
    if (rows.length) {
      const { error } = await context.supabase.from("learning_plans").insert(rows);
      if (error) throw new Error("Could not save your learning plan.");
    }
    return { added: rows.length };
  });

export const updateLearningMilestones = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), milestones: z.array(MilestoneSchema).max(12) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("learning_plans").update({ milestones: data.milestones })
      .eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error("Could not update this milestone.");
    return { ok: true };
  });

export const deleteLearningPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("learning_plans").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error("Could not remove this plan.");
    return { ok: true };
  });
