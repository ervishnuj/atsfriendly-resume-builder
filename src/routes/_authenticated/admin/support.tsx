import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminGate, AdminNav } from "@/components/admin/AdminGate";
import { adminListSupport, adminUpdateSupport } from "@/lib/admin-monitoring.functions";
import { formatDate } from "@/lib/billing-shared";

export const Route = createFileRoute("/_authenticated/admin/support")({
  head: () => ({
    meta: [
      { title: "Admin · Support inbox — TheResumeRocket" },
      { name: "description", content: "Review and resolve support and feedback messages." },
      { property: "og:title", content: "Admin · Support inbox" },
      { property: "og:description", content: "Review and resolve support messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => {
    const { user } = Route.useRouteContext();
    return <AdminGate userId={user.id}><Support userId={user.id} /></AdminGate>;
  },
});

type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED";
const LABEL: Record<Status, string> = { OPEN: "Open", IN_PROGRESS: "In progress", RESOLVED: "Resolved" };

function Support({ userId }: { userId: string }) {
  const [filter, setFilter] = useState<"ALL" | Status>("OPEN");
  const list = useServerFn(adminListSupport);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-support", userId, filter],
    queryFn: () => list({ data: { status: filter } }),
  });
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <h1 className="text-lg font-semibold">Support inbox</h1>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {(["OPEN", "IN_PROGRESS", "RESOLVED", "ALL"] as const).map((s) => (
            <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} aria-pressed={filter === s} onClick={() => setFilter(s)}>
              {s === "ALL" ? "All" : LABEL[s]}
            </Button>
          ))}
        </div>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
        ) : error ? (
          <Card className="p-6 text-sm text-destructive">Could not load messages. Please refresh.</Card>
        ) : !data?.length ? (
          <Card className="p-6 text-sm text-muted-foreground">No messages here.</Card>
        ) : (
          data.map((m) => <MessageCard key={m.id} m={m} />)
        )}
      </main>
    </div>
  );
}

function MessageCard({ m }: { m: { id: string; name: string; email: string; category: string; subject: string; message: string; status: string; admin_note: string | null; created_at: string } }) {
  const update = useServerFn(adminUpdateSupport);
  const qc = useQueryClient();
  const [note, setNote] = useState(m.admin_note ?? "");
  const [busy, setBusy] = useState(false);
  const save = async (status: Status) => {
    setBusy(true);
    try {
      await update({ data: { id: m.id, status, adminNote: note } });
      await qc.invalidateQueries({ queryKey: ["admin-support"] });
      toast.success(`Marked ${LABEL[status].toLowerCase()}.`);
    } catch {
      toast.error("Could not update this message.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{m.subject}</p>
          <p className="text-xs text-muted-foreground">{m.name} · <a className="underline" href={`mailto:${m.email}`}>{m.email}</a> · {formatDate(m.created_at)}</p>
        </div>
        <div className="flex gap-2"><Badge variant="outline">{m.category}</Badge><Badge>{LABEL[m.status as Status] ?? m.status}</Badge></div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm">{m.message}</p>
      <div className="mt-4 space-y-2">
        <Label htmlFor={`note-${m.id}`}>Internal note / reply summary</Label>
        <Textarea id={`note-${m.id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={2} />
        <p className="text-xs text-muted-foreground">Reply to the person by email; notes are only visible to admins.</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void save("IN_PROGRESS")}>In progress</Button>
        <Button size="sm" disabled={busy} onClick={() => void save("RESOLVED")}>Resolve</Button>
        {m.status !== "OPEN" && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void save("OPEN")}>Reopen</Button>}
      </div>
    </Card>
  );
}
