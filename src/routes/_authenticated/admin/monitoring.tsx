import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminGate, AdminNav } from "@/components/admin/AdminGate";
import { adminGetMonitoring, adminListErrors, adminSetErrorStatus } from "@/lib/admin-monitoring.functions";
import { formatDate } from "@/lib/billing-shared";

export const Route = createFileRoute("/_authenticated/admin/monitoring")({
  head: () => ({
    meta: [
      { title: "Admin · Monitoring — TheResumeRocket" },
      { name: "description", content: "Usage, failures and funnel conversion for administrators." },
      { property: "og:title", content: "Admin · Monitoring" },
      { property: "og:description", content: "Usage, failures and funnel conversion." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => {
    const { user } = Route.useRouteContext();
    return <AdminGate userId={user.id}><Monitoring userId={user.id} /></AdminGate>;
  },
});

function pct(a: number, b: number) {
  return b > 0 ? `${Math.round((a / b) * 100)}%` : "—";
}

function Monitoring({ userId }: { userId: string }) {
  const [period, setPeriod] = useState<"day" | "month">("day");
  const getStats = useServerFn(adminGetMonitoring);
  const getErrors = useServerFn(adminListErrors);
  const setStatus = useServerFn(adminSetErrorStatus);
  const qc = useQueryClient();
  const { data: s, isLoading, error } = useQuery({
    queryKey: ["admin-monitoring", userId, period],
    queryFn: () => getStats({ data: { period } }),
  });
  const { data: errors } = useQuery({ queryKey: ["admin-errors", userId], queryFn: () => getErrors() });

  const tiles: Array<[string, number | string]> = s
    ? [
        ["Registered users (all time)", s.registeredUsers],
        ["New users", s.newUsers],
        ["Active users (used AI)", s.activeUsers],
        ["Resumes generated", s.resumeSuccess],
        ["Failed generations", s.resumeFailed],
        ["AI ATS analyses", s.analysisSuccess],
        ["Failed analyses", s.analysisFailed],
        ["PDF/DOCX upload failures (checker)", s.uploadFailures],
        ["AI errors logged", s.aiErrors],
        ["Payments verified", s.paymentsSucceeded],
        ["Payment failures", s.paymentFailures],
        ["Active partners (now)", s.activePartners],
        ["Partner credits used", s.partnerCreditsUsed],
      ]
    : [];
  const f = s?.funnel;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <h1 className="text-lg font-semibold">Monitoring</h1>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Period">
          <Button variant={period === "day" ? "default" : "outline"} size="sm" onClick={() => setPeriod("day")} aria-pressed={period === "day"}>Today</Button>
          <Button variant={period === "month" ? "default" : "outline"} size="sm" onClick={() => setPeriod("month")} aria-pressed={period === "month"}>This month</Button>
          <span className="text-xs text-muted-foreground">India time. Counts come straight from stored records.</span>
        </div>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
        ) : error ? (
          <Card className="p-6 text-sm text-destructive">Could not load monitoring data. Please refresh.</Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {tiles.map(([label, value]) => (
                <Card key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
                </Card>
              ))}
            </div>
            {f && (
              <Card className="p-6">
                <h2 className="text-sm font-semibold">Funnel</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Visits are page views (one visitor can count more than once); sign-ups and paying customers are accounts. Tracking of visits and checker steps began 12 Nov 2026.
                </p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div><dt className="text-muted-foreground">Homepage views</dt><dd className="font-semibold">{f.homepageViews}</dd></div>
                  <div><dt className="text-muted-foreground">Checker started / completed</dt><dd className="font-semibold">{f.checkerStarted} / {f.checkerCompleted} ({pct(f.checkerCompleted, f.checkerStarted)} completion)</dd></div>
                  <div><dt className="text-muted-foreground">Visit → checker</dt><dd className="font-semibold">{pct(f.checkerStarted, f.homepageViews)}</dd></div>
                  <div><dt className="text-muted-foreground">Checker → sign-up</dt><dd className="font-semibold">{f.signups} sign-ups ({pct(f.signups, f.checkerCompleted)})</dd></div>
                  <div><dt className="text-muted-foreground">Sign-up → paid</dt><dd className="font-semibold">{f.payingCustomers} paying ({pct(f.payingCustomers, f.signups)})</dd></div>
                  <div><dt className="text-muted-foreground">Generation success rate</dt><dd className="font-semibold">{pct(s!.resumeSuccess, s!.resumeSuccess + s!.resumeFailed)}</dd></div>
                </dl>
              </Card>
            )}
          </>
        )}
        <Card className="p-6">
          <h2 className="text-sm font-semibold">Error log</h2>
          <p className="mt-1 text-xs text-muted-foreground">Latest 100. No resume text or personal details are stored here.</p>
          {!errors?.length ? (
            <p className="mt-4 text-sm text-muted-foreground">No errors recorded.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Category</TableHead><TableHead>Service</TableHead><TableHead>Request ID</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {errors.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(e.created_at)}</TableCell>
                      <TableCell>{e.category}</TableCell>
                      <TableCell>{e.service}</TableCell>
                      <TableCell className="max-w-[12rem] truncate font-mono text-xs">{e.request_id ?? "—"}</TableCell>
                      <TableCell><Badge variant={e.status === "OPEN" ? "destructive" : "secondary"}>{e.status === "OPEN" ? "Open" : "Resolved"}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={async () => {
                          try {
                            await setStatus({ data: { id: e.id, status: e.status === "OPEN" ? "RESOLVED" : "OPEN" } });
                            await qc.invalidateQueries({ queryKey: ["admin-errors"] });
                          } catch { toast.error("Could not update this error."); }
                        }}>{e.status === "OPEN" ? "Mark resolved" : "Reopen"}</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
