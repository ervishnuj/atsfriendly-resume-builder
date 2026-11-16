import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gauge, Layers, FileText, Loader2, Copy, Upload } from "lucide-react";
import { AtsScoreBadge } from "@/components/AtsScoreBadge";
import { AtsBreakdownPanel } from "@/components/AtsBreakdown";
import {
  analyzeAtsScore,
  analyzeImportedResumeAts,
  analyzeSkillGap,
  generateCoverLetter,
  type AtsAnalysis,
  type SkillGapAnalysis,
  type CoverLetterResult,
} from "@/lib/resume.functions";
import type { Profile } from "@/components/ProfileForm";
import { newGenerationRequestId, parseAiLimitError } from "@/lib/ai-limits";
import { extractResumeText } from "@/lib/resume-import";

type Props = {
  profile: Profile;
  jobDescription: string;
  onSubscriptionRequired: () => void;
};

export function AiInsightsPanel({ profile, jobDescription, onSubscriptionRequired }: Props) {
  const runAts = useServerFn(analyzeAtsScore);
  const runImportedAts = useServerFn(analyzeImportedResumeAts);
  const runGap = useServerFn(analyzeSkillGap);
  const runCover = useServerFn(generateCoverLetter);
  const [busy, setBusy] = useState<null | "ats" | "gap" | "cover" | "import">(null);
  const [ats, setAts] = useState<AtsAnalysis | null>(null);
  const [atsSource, setAtsSource] = useState<string | null>(null);
  const [gap, setGap] = useState<SkillGapAnalysis | null>(null);
  const [cover, setCover] = useState<CoverLetterResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const guard = () => {
    if (!jobDescription.trim()) {
      toast.error("Paste the target job description first.");
      return false;
    }
    if (!profile.personal.fullName.trim()) {
      toast.error("Add your full name to your profile first.");
      return false;
    }
    return true;
  };

  const handle = async (
    kind: "ats" | "gap" | "cover" | "import",
    fn: () => Promise<unknown>,
    apply: (v: never) => void,
  ) => {
    if (!guard() || busy) return;
    setBusy(kind);
    try {
      apply((await fn()) as never);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      const limit = parseAiLimitError(msg);
      if (limit) {
        toast.warning(limit.message);
      } else if (msg.includes("SUBSCRIPTION_REQUIRED")) {
        toast.error("This is a premium feature. Please choose a plan.");
        onSubscriptionRequired();
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(null);
    }
  };

  const guardedData = () => ({
    data: { profile, jobDescription, requestId: newGenerationRequestId() },
  });

  /** Import an existing PDF/DOCX resume and score it against the JD. */
  const handleImportedAts = async (file: File) => {
    if (!jobDescription.trim()) {
      toast.error("Paste the target job description first.");
      return;
    }
    if (busy) return;
    setBusy("import");
    try {
      const resumeText = await extractResumeText(file);
      const result = await runImportedAts({
        data: { resumeText, jobDescription, requestId: newGenerationRequestId() },
      });
      setAts(result);
      setAtsSource(file.name);
      toast.success(`ATS analysis ready for ${file.name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to analyze the resume right now.";
      const limit = parseAiLimitError(msg);
      toast[limit ? "warning" : "error"](
        limit ? limit.message : msg.includes("SUBSCRIPTION_REQUIRED")
          ? "Unable to analyze the resume right now. Please try again."
          : msg,
      );
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card id="skill-gap-analyzer" className="scroll-mt-24 p-4 print:hidden">
      <h2 className="text-sm font-semibold">AI Analysis</h2>
      <p className="mb-3 mt-1 text-xs">
        <Link to="/how-it-works" hash="ai-analysis" className="text-muted-foreground hover:text-foreground hover:underline">
          Learn what each analysis does →
        </Link>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() =>
            void handle("ats", () => runAts(guardedData()), (v) => {
              setAts(v);
              setAtsSource(null);
            })
          }
          disabled={busy !== null}
        >
          {busy === "ats" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />}
          ATS Score
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => fileRef.current?.click()}
          disabled={busy !== null}
        >
          {busy === "import" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Check Existing Resume
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          aria-label="Upload an existing resume (PDF or DOCX) to check its ATS score"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportedAts(file);
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => void handle("gap", () => runGap(guardedData()), (v) => setGap(v))}
          disabled={busy !== null}
        >
          {busy === "gap" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
          Skill Gap
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => void handle("cover", () => runCover(guardedData()), (v) => setCover(v))}
          disabled={busy !== null}
        >
          {busy === "cover" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Cover Letter
        </Button>
      </div>

      {ats && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          {atsSource && (
            <p className="text-xs text-muted-foreground">
              Scored from your uploaded resume: <span className="font-medium">{atsSource}</span>
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <AtsScoreBadge
              score={ats.atsScore ?? ats.score}
              title="ATS Score"
              caption="Overall ATS-readiness of your resume"
            />
            <AtsScoreBadge
              score={ats.atsMatchScore ?? 0}
              title="ATS Match Score"
              unit="%"
              caption="How closely your resume matches this job description"
            />
          </div>
          <AtsBreakdownPanel breakdown={ats.breakdown} matchBreakdown={ats.matchBreakdown} />
          <ChipRow label="Matched skills & keywords" items={ats.matchedKeywords ?? []} tone="good" />
          <ChipRow
            label="Missing required skills"
            items={ats.missingRequiredKeywords ?? []}
            tone="bad"
          />
          <ChipRow
            label="Missing preferred skills"
            items={ats.missingPreferredKeywords ?? []}
            tone="warn"
          />
          <ListBlock label="Strengths" items={ats.strengths} />
          <ListBlock label="Weaknesses" items={ats.weaknesses} />
          <ListBlock label="Recommendations" items={ats.recommendations ?? ats.suggestions} />
        </div>
      )}

      {gap && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <ChipRow label="Matched skills" items={gap.matchedSkills} tone="good" />
          <ChipRow label="Partial skills" items={gap.partialSkills} tone="warn" />
          <ChipRow label="Missing skills" items={gap.missingSkills} tone="bad" />
          {gap.learningPlan.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">Learning plan</div>
              <ul className="space-y-2">
                {gap.learningPlan.map((p) => (
                  <li key={p.skill} className="rounded-md border border-border p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.skill}</span>
                      <Badge variant="secondary" className="text-[10px] uppercase">{p.priority}</Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">{p.why}</p>
                    <p className="mt-1 text-muted-foreground">{p.howToLearn}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {cover && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-muted-foreground">Cover letter</div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => {
                void navigator.clipboard.writeText(cover.coverLetter);
                toast.success("Cover letter copied.");
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
            {cover.coverLetter}
          </p>
          <ListBlock label="Highlights" items={cover.highlights} />
        </div>
      )}
    </Card>
  );
}

function ChipRow({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "good" | "bad" | "warn";
}) {
  if (!items?.length) return null;
  const cls =
    tone === "good"
      ? "bg-success-soft text-success-foreground hover:bg-success-soft dark:bg-success-soft dark:text-success-foreground"
      : tone === "warn"
        ? "bg-warning-soft text-warning-foreground hover:bg-warning-soft dark:bg-warning-soft dark:text-warning-foreground"
        : "bg-destructive/10 text-destructive hover:bg-destructive/10 dark:bg-destructive/10 dark:text-destructive";
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">
        {label} ({items.length})
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((k) => (
          <Badge key={k} variant="secondary" className={cls}>
            {k}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function ListBlock({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
