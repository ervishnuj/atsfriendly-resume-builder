import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractResumeText, MAX_RESUME_BYTES } from "@/lib/resume-import";

type Props = {
  onText: (text: string) => void;
  onBusy: (busy: boolean) => void;
};

export function AtsResumeUpload({ onText, onBusy }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => () => { request.current += 1; }, []);

  const remove = () => {
    request.current += 1;
    setFileName(""); setError(""); setLoaded(false); setBusy(false);
    onText(""); onBusy(false);
    if (input.current) input.current.value = "";
  };

  const process = async (file: File | undefined) => {
    if (!file) return;
    const id = ++request.current;
    setFileName(file.name); setError(""); setLoaded(false); setBusy(true);
    onText(""); onBusy(true);
    try {
      const text = await extractResumeText(file);
      if (request.current !== id) return;
      onText(text); setLoaded(true);
    } catch (caught) {
      if (request.current !== id) return;
      setError(caught instanceof Error ? caught.message : "Could not read this resume. Try another file or paste its text.");
    } finally {
      if (request.current === id) { setBusy(false); onBusy(false); }
      if (input.current && request.current === id) input.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <input ref={input} aria-label="Upload resume file" type="file" className="hidden" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { void process(event.target.files?.[0]); }} />
      <div className="flex min-h-32 flex-col items-center justify-center gap-3 border border-dashed border-border p-4">
        <Upload className="h-6 w-6 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">PDF or DOCX · up to {MAX_RESUME_BYTES / 1024 / 1024} MB</p>
        <Button variant="outline" disabled={busy} onClick={() => input.current?.click()} className="gap-2">
          <Upload className="h-4 w-4" />{fileName ? "Replace file" : "Choose resume"}
        </Button>
      </div>
      {fileName && <div className="flex min-w-0 items-center gap-2 border-b border-border pb-3">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 break-all text-sm">{fileName}</span>
        <Button variant="ghost" size="icon" aria-label="Remove uploaded resume" title="Remove uploaded resume" onClick={remove}><X className="h-4 w-4" /></Button>
      </div>}
      {busy && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Extracting resume text…</p>}
      {loaded && <p role="status" className="text-sm text-primary">Resume text extracted. Ready for analysis.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error} Replace the file or choose Paste Resume Text.</p>}
    </div>
  );
}