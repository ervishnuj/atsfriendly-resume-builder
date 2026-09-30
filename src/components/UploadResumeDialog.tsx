import { useRef, useState, type SetStateAction } from "react";
import { FileUp, Loader2, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ProfileForm, type Profile } from "@/components/ProfileForm";
import { extractResumeText, MAX_RESUME_BYTES } from "@/lib/resume-import";
import { hasProfileContent, parseResumeText, profileDifferences } from "@/lib/resume-parser";
import type { ProfileImportIssue } from "@/lib/profile-io";
import { SaveProfileSchema } from "@/lib/save-schemas";

type Props = {
  currentProfile: Profile;
  onApply: (profile: Profile, issues: ProfileImportIssue[], originalText?: string) => void;
};

type Stage = "choose" | "extracting" | "review" | "compare" | "error";

export function UploadResumeDialog({ currentProfile, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("choose");
  const [draft, setDraft] = useState<Profile | null>(null);
  const [issues, setIssues] = useState<ProfileImportIssue[]>([]);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [originalText, setOriginalText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const updateDraft = (action: SetStateAction<Profile>) => {
    setDraft((previous) => previous ? (typeof action === "function" ? action(previous) : action) : previous);
    setIssues([]);
  };

  const reset = () => {
    setStage("choose"); setDraft(null); setIssues([]); setError(""); setFileName(""); setOriginalText("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const processFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setError("");
    setStage("extracting");
    try {
      const text = await extractResumeText(file);
      setOriginalText(text);
      const parsed = parseResumeText(text);
      setDraft(parsed.profile);
      setIssues(parsed.issues);
      setStage("review");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't process that resume. Please try again.");
      setStage("error");
    }
  };

  const apply = () => {
    if (!draft) return;
    onApply(draft, issues, originalText);
    setOpen(false);
    reset();
  };

  const continueAfterReview = () => {
    if (!draft) return;
    const validated = SaveProfileSchema.safeParse({ profile: draft });
    if (!validated.success) {
      setIssues(validated.error.issues.map((issue) => ({
        field: issue.path.slice(1).join(" → "),
        path: issue.path.slice(1).join("."),
        message: issue.message,
      })));
      return;
    }
    if (hasProfileContent(currentProfile)) setStage("compare");
    else apply();
  };

  const differences = draft ? profileDifferences(currentProfile, draft) : [];
  const compareDetails = (label: string, profile: Profile) => {
    const fields: Record<string, string> = {
      "Full name": profile.personal.fullName,
      "Professional title": profile.personal.title,
      Email: profile.personal.email,
      Phone: profile.personal.phone,
      LinkedIn: profile.personal.linkedin,
      GitHub: profile.personal.github,
      Portfolio: profile.personal.portfolio,
      Summary: profile.personal.summary,
      Skills: profile.skills.map((group) => `${group.category}: ${group.items.join(", ")}`).filter((value) => !value.startsWith("Technical Skills: ")).join("; "),
      "Experience and projects": profile.experience.map((entry) => [entry.title, entry.company].filter(Boolean).join(" · ")).filter(Boolean).join("; "),
      Education: profile.education.map((entry) => [entry.degree, entry.institution].filter(Boolean).join(" · ")).filter(Boolean).join("; "),
    };
    return fields[label] || "Not provided";
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-auto min-h-20 flex-1 items-start justify-start gap-3 whitespace-normal p-3 text-left">
          <Upload className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <span><span className="block font-semibold">Upload Existing Resume</span><span className="mt-1 block text-xs font-normal text-muted-foreground">Upload your current PDF/DOCX resume and we’ll extract the details for you.</span></span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{stage === "review" || stage === "compare" ? "Review Your Resume Details" : "Upload Existing Resume"}</DialogTitle>
          <DialogDescription>
            {stage === "review" || stage === "compare" ? "Please review the extracted information before continuing." : "Your file is processed only in this browser and is not uploaded or stored."}
          </DialogDescription>
        </DialogHeader>

        <input ref={inputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(event) => { void processFile(event.target.files?.[0]); }} />

        {stage === "choose" && <div className="rounded-md border border-dashed border-border p-8 text-center"><FileUp className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm font-medium">PDF or DOCX · maximum {MAX_RESUME_BYTES / 1024 / 1024} MB</p><Button className="mt-4" onClick={() => inputRef.current?.click()}>Choose resume</Button></div>}
        {stage === "extracting" && <div role="status" className="py-12 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /><p className="mt-4 font-semibold">Analyzing your resume…</p><p className="mt-1 text-sm text-muted-foreground">Extracting your experience, skills and education…</p></div>}
        {stage === "error" && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-5 text-center"><p className="font-semibold text-destructive">Resume processing failed</p><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button variant="outline" className="mt-4 gap-2" onClick={reset}><RotateCcw className="h-4 w-4" />Try Again</Button></div>}
        {stage === "review" && draft && <div><div className="mb-4 rounded-md border border-border bg-muted/40 p-3 text-sm"><span className="font-medium">{fileName}</span><span className="text-muted-foreground"> · extraction uses deterministic text matching and may need corrections.</span>{issues.length > 0 && <p role="alert" className="mt-1 text-destructive">{issues.length} field{issues.length === 1 ? "" : "s"} need review: {issues.map((issue) => `${issue.field} (${issue.message})`).join("; ")}</p>}</div><ProfileForm profile={draft} setProfile={updateDraft} fieldErrors={Object.fromEntries(issues.map((issue) => [issue.path, issue.message]))} /></div>}
        {stage === "compare" && draft && <div className="space-y-4"><div className="rounded-md border border-border bg-muted/40 p-4"><p className="font-semibold">Your existing profile will not be changed automatically.</p><p className="mt-1 text-sm text-muted-foreground">Review the differences, then keep your current information or replace it with the reviewed extraction.</p></div><div><p className="text-sm font-medium">Extracted differences</p>{differences.length ? <ul className="mt-2 space-y-2">{differences.map((item) => <li key={item} className="rounded-md border border-border px-3 py-2 text-sm"><p className="font-medium">{item}</p><div className="mt-2 grid gap-3 sm:grid-cols-2"><p className="min-w-0 break-words text-muted-foreground"><span className="block text-xs font-medium">Current</span>{compareDetails(item, currentProfile)}</p><p className="min-w-0 break-words"><span className="block text-xs font-medium">Extracted</span>{compareDetails(item, draft)}</p></div></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No meaningful differences were detected.</p>}</div></div>}

        {(stage === "review" || stage === "compare") && <DialogFooter>
          {stage === "review" ? <><Button variant="ghost" onClick={reset}>Choose another file</Button><Button onClick={continueAfterReview}>Continue</Button></> : <><Button variant="outline" onClick={() => { setOpen(false); reset(); }}>Keep existing information</Button><Button onClick={apply}>Replace with extracted information</Button></>}
        </DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}