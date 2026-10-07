import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { deleteLearningPlan, listLearningPlans, updateLearningMilestones } from "@/lib/learning-plans.functions";
import { planProgress, proposeProfileAddition, type LearningPlan, type Milestone, type ProfileAddition } from "@/lib/learning-plan";
import type { ProfileInput } from "@/lib/resume-schemas";

const STATUS_LABEL: Record<Milestone["status"], string> = { notStarted: "Not started", inProgress: "In progress", completed: "Completed" };

export function LearningPlanPanel({ userId, onAddToProfile }: { userId: string; onAddToProfile: (apply: (p: ProfileInput) => ProfileInput) => void }) {
  const list = useServerFn(listLearningPlans);
  const update = useServerFn(updateLearningMilestones);
  const remove = useServerFn(deleteLearningPlan);
  const queryClient = useQueryClient();
  const key = ["learning-plans", userId];
  const { data: plans = [] } = useQuery({ queryKey: key, queryFn: () => list() });
  const [review, setReview] = useState<{ plan: LearningPlan; addition: ProfileAddition } | null>(null);

  const save = async (plan: LearningPlan, milestones: Milestone[]) => {
    queryClient.setQueryData<LearningPlan[]>(key, (old) => old?.map((p) => (p.id === plan.id ? { ...p, milestones } : p)));
    try { await update({ data: { id: plan.id, milestones } }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save."); void queryClient.invalidateQueries({ queryKey: key }); }
  };
  const patch = (plan: LearningPlan, id: string, change: Partial<Milestone>) =>
    plan.milestones.map((m) => (m.id === id ? { ...m, ...change } : m));

  if (!plans.length) return null;
  return (
    <Card className="p-4 print:hidden" id="learning-plan">
      <h2 className="text-sm font-semibold">My learning plan</h2>
      <p className="mt-1 text-xs text-muted-foreground">Track progress on job-skill gaps. Completed work is added to your profile only after you review it.</p>
      <div className="mt-3 space-y-4">
        {plans.map((plan) => (
          <div key={plan.id} className="border-t border-border pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{plan.skill}</span>
                <Badge variant="secondary" className="text-[10px]">{plan.priority}</Badge>
              </div>
              <Button variant="ghost" size="sm" aria-label={`Remove ${plan.skill} plan`} onClick={async () => {
                await remove({ data: { id: plan.id } }).catch(() => toast.error("Could not remove this plan."));
                void queryClient.invalidateQueries({ queryKey: key });
              }}><Trash2 className="h-4 w-4" /></Button>
            </div>
            {plan.why && <p className="text-xs text-muted-foreground">{plan.why}{plan.jobTitle ? ` (${plan.jobTitle})` : ""}</p>}
            <div className="mt-2 flex items-center gap-2"><Progress value={planProgress(plan.milestones)} className="h-2" /><span className="text-xs text-muted-foreground">{planProgress(plan.milestones)}%</span></div>
            <ul className="mt-3 space-y-3">
              {plan.milestones.map((m) => {
                const addition = proposeProfileAddition(plan.skill, m);
                return (
                  <li key={m.id} className="text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={m.status === "completed" ? "font-medium line-through decoration-muted-foreground" : "font-medium"}>{m.title}</span>
                      <select aria-label={`Status for ${m.title}`} value={m.status} className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                        onChange={(e) => void save(plan, patch(plan, m.id, { status: e.target.value as Milestone["status"], addedToProfile: false }))}>
                        {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    {m.status !== "notStarted" && (
                      <Textarea className="mt-1 min-h-14 text-xs" defaultValue={m.evidence} maxLength={600}
                        placeholder={m.kind === "project" ? "Describe what you built (needed to add it to your profile)" : "Notes, e.g. course name or what you covered"}
                        onBlur={(e) => { if (e.target.value !== m.evidence) void save(plan, patch(plan, m.id, { evidence: e.target.value })); }} />
                    )}
                    {m.status === "completed" && m.kind === "project" && !m.evidence.trim() && <p className="mt-1 text-muted-foreground">Add a description of your project to add it to your profile.</p>}
                    {addition && <Button variant="outline" size="sm" className="mt-2" onClick={() => setReview({ plan, addition })}>Review & add to profile</Button>}
                    {m.addedToProfile && <p className="mt-1 text-muted-foreground">✓ Added to your profile</p>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <AlertDialog open={!!review} onOpenChange={(o) => !o && setReview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add this to your profile?</AlertDialogTitle>
            <AlertDialogDescription>
              {review?.addition.description}. It will be labeled honestly and never listed as work experience. Only continue if this is accurate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (!review) return;
              onAddToProfile(review.addition.apply);
              void save(review.plan, patch(review.plan, review.addition.milestoneId, { addedToProfile: true }));
              toast.success("Added to your profile.");
              setReview(null);
            }}>Add to profile</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
