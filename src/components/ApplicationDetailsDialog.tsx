import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  APPLICATION_PLATFORMS,
  APPLICATION_STATUS_LABELS,
  PLATFORM_LABELS,
  TRACKER_STATUSES,
  localDateString,
  needsCustomPlatform,
  type ApplicationPlatform,
  type ApplicationStatus,
} from "@/lib/applications-shared";

export type ApplicationDraft = {
  company: string;
  jobTitle: string;
  appliedAt: string;
  platform: ApplicationPlatform | "";
  customPlatform: string;
  jobDescription: string;
  jobUrl: string;
  status: ApplicationStatus;
  notes: string;
  location: string;
  salary: string;
  resumeVersionId: string;
};

export const blankApplicationDraft = (): ApplicationDraft => ({
  company: "",
  jobTitle: "",
  appliedAt: localDateString(),
  platform: "",
  customPlatform: "",
  jobDescription: "",
  jobUrl: "",
  status: "RESUME_GENERATED",
  notes: "",
  location: "",
  salary: "",
  resumeVersionId: "",
});

/** Returns a user-facing error, or null when the draft can be saved. */
export function validateApplicationDraft(d: ApplicationDraft): string | null {
  if (!d.company.trim()) return "Company name is required.";
  if (!d.jobTitle.trim()) return "Job role is required.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.appliedAt)) return "Choose a valid application date.";
  if (needsCustomPlatform(d.platform) && !d.customPlatform.trim()) return "Enter the platform name.";
  if (d.jobUrl.trim() && !/^https?:\/\/\S+$/i.test(d.jobUrl.trim()))
    return "Job posting URL must start with http:// or https://";
  return null;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ApplicationDraft;
  title: string;
  description: string;
  saveLabel: string;
  cancelLabel: string;
  saving: boolean;
  onSave: (draft: ApplicationDraft) => void;
  onCancel?: () => void;
  /** Extra fields (e.g. resume version picker) rendered before notes. */
  extra?: (draft: ApplicationDraft, set: (patch: Partial<ApplicationDraft>) => void) => React.ReactNode;
  showLocationSalary?: boolean;
};

export function ApplicationDetailsDialog(props: Props) {
  const [draft, setDraft] = useState<ApplicationDraft>(props.initial);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (props.open) {
      setDraft(props.initial);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);
  const set = (patch: Partial<ApplicationDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const submit = () => {
    if (props.saving) return;
    const problem = validateApplicationDraft(draft);
    setError(problem);
    if (!problem) props.onSave(draft);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[100dvh] flex-col gap-0 overflow-hidden p-0 max-sm:h-[100dvh] max-sm:max-w-none max-sm:rounded-none sm:max-h-[90vh] sm:max-w-lg">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        <form
          id="application-details-form"
          className="grid flex-1 gap-4 overflow-y-auto px-5 py-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="app-company">Company name *</Label>
            <Input id="app-company" className="h-11 sm:h-10" value={draft.company} onChange={(e) => set({ company: e.target.value })} placeholder="Acme Corp" maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="app-role">Job role / designation *</Label>
            <Input id="app-role" className="h-11 sm:h-10" value={draft.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} placeholder="Java Full Stack Developer" maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="app-date">Application date</Label>
            <Input id="app-date" type="date" className="h-11 sm:h-10" value={draft.appliedAt} onChange={(e) => set({ appliedAt: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="app-status">Application status</Label>
            <Select value={draft.status} onValueChange={(v) => set({ status: v as ApplicationStatus })}>
              <SelectTrigger id="app-status" className="h-11 sm:h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(TRACKER_STATUSES as readonly ApplicationStatus[]).concat(TRACKER_STATUSES.includes(draft.status as never) ? [] : [draft.status]).map((s) => (
                  <SelectItem key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="app-platform">Application platform</Label>
            <Select value={draft.platform || "none"} onValueChange={(v) => set({ platform: v === "none" ? "" : (v as ApplicationPlatform) })}>
              <SelectTrigger id="app-platform" className="h-11 sm:h-10"><SelectValue placeholder="Choose a platform" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {APPLICATION_PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsCustomPlatform(draft.platform) && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="app-custom-platform">Platform name *</Label>
              <Input id="app-custom-platform" className="h-11 sm:h-10" value={draft.customPlatform} onChange={(e) => set({ customPlatform: e.target.value })} placeholder="e.g. Instahyre, recruitment agency" maxLength={120} />
            </div>
          )}
          {props.showLocationSalary && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="app-location">Location</Label>
                <Input id="app-location" className="h-11 sm:h-10" value={draft.location} onChange={(e) => set({ location: e.target.value })} placeholder="Bengaluru / Remote" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="app-salary">Salary / CTC</Label>
                <Input id="app-salary" className="h-11 sm:h-10" value={draft.salary} onChange={(e) => set({ salary: e.target.value })} placeholder="₹12 LPA" />
              </div>
            </>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="app-url">Job posting URL</Label>
            <Input id="app-url" type="url" inputMode="url" className="h-11 sm:h-10" value={draft.jobUrl} onChange={(e) => set({ jobUrl: e.target.value })} placeholder="https://..." maxLength={500} />
          </div>
          {props.extra?.(draft, set)}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="app-jd">Job description</Label>
            <Textarea id="app-jd" rows={4} value={draft.jobDescription} onChange={(e) => set({ jobDescription: e.target.value })} placeholder="Optional — paste the job description" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="app-notes">Notes</Label>
            <Textarea id="app-notes" rows={3} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Optional" />
          </div>
          {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
        </form>
        <DialogFooter className="gap-2 border-t border-border px-5 py-3 max-sm:flex-col-reverse">
          <Button type="button" variant="outline" className="min-h-11 sm:min-h-0" onClick={() => (props.onCancel ? props.onCancel() : props.onOpenChange(false))} disabled={props.saving}>
            {props.cancelLabel}
          </Button>
          <Button type="submit" form="application-details-form" className="min-h-11 sm:min-h-0" disabled={props.saving}>
            {props.saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {props.saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
