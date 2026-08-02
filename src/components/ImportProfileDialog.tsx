import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileUp } from "lucide-react";
import { parseProfileJson, ProfileImportError, type ProfileImportIssue } from "@/lib/profile-io";
import type { Profile } from "@/components/ProfileForm";

type Props = {
  onImport: (profile: Profile) => void;
};

export function ImportProfileDialog({ onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ProfileImportIssue[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const content = await file.text();
      setText(content);
      setError(null);
      setIssues([]);
    } catch {
      setError("Couldn't read that file.");
      setIssues([]);
    }
  };

  const handleImport = () => {
    try {
      onImport(parseProfileJson(text));
      setText("");
      setError(null);
      setIssues([]);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
      setIssues(err instanceof ProfileImportError ? err.issues : []);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setIssues([]);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Upload className="h-4 w-4" /> Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import profile JSON</DialogTitle>
          <DialogDescription>
            Upload a saved profile file or paste the JSON below. This replaces
            your current profile and is saved locally.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json,.txt"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          className="w-full gap-2"
        >
          <FileUp className="h-4 w-4" /> Choose a .json file
        </Button>

        <Textarea
          rows={10}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
            setIssues([]);
          }}
          placeholder={'{\n  "personal": { "fullName": "Ada Lovelace", ... },\n  "skills": [],\n  "experience": [],\n  "education": []\n}'}
          className="font-mono text-xs"
        />

        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/5 p-3"
          >
            <p className="text-sm font-medium text-destructive">{error}</p>
            {issues.length > 0 && (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-destructive">
                {issues.map((issue, i) => (
                  <li key={`${issue.field}-${i}`} className="flex gap-1.5">
                    <span className="font-semibold">{issue.field}:</span>
                    <span>{issue.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!text.trim()}>
            Import profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
