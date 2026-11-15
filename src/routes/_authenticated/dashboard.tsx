import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { FileText, Sparkles, ScanSearch, Briefcase, ArrowRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeading, MetricCard, EmptyState } from "@/components/ui/page-patterns";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { listResumeVersions } from "@/lib/versions.functions";
import { listJobApplications } from "@/lib/applications.functions";
import { computeApplicationStats } from "@/lib/applications-shared";
import { getCurrentSubscription } from "@/lib/billing.functions";
import { getMyAiUsage } from "@/lib/resume.functions";
import { formatDate } from "@/lib/billing-shared";

const versionsOptions = (id: string) => queryOptions({ queryKey: ["resume-versions", id], queryFn: () => listResumeVersions() });
const appsOptions = (id: string) => queryOptions({ queryKey: ["job-applications", id], queryFn: () => listJobApplications() });
const subscriptionOptions = (id: string) => queryOptions({ queryKey: ["subscription", id], queryFn: () => getCurrentSubscription() });
const usageOptions = (id: string) => queryOptions({ queryKey: ["ai-usage", id], queryFn: () => getMyAiUsage() });

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [
    { title: "Your Job Search Dashboard — TheResumeRocket" },
    { name: "description", content: "Your saved resumes, account allowances, subscription and job applications in one private workspace." },
    { property: "og:title", content: "Your Job Search Dashboard — TheResumeRocket" },
    { property: "og:description", content: "Your private resume and job-search workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  loader: async ({ context }) => {
    await Promise.all([context.queryClient.ensureQueryData(versionsOptions(context.user.id)), context.queryClient.ensureQueryData(appsOptions(context.user.id)), context.queryClient.ensureQueryData(subscriptionOptions(context.user.id)), context.queryClient.ensureQueryData(usageOptions(context.user.id))]);
  },
  pendingComponent: () => <div role="status" className="mx-auto max-w-6xl px-5 py-16 text-muted-foreground">Loading your workspace…</div>,
  errorComponent: () => { const router = useRouter(); return <div className="mx-auto max-w-xl px-5 py-16"><EmptyState icon={FileText} title="Your dashboard couldn't load" description="Try again to load your saved resumes and account details." actions={<Button onClick={() => void router.invalidate()}>Try again</Button>} /></div>; },
  notFoundComponent: () => <p className="p-8">Dashboard unavailable.</p>,
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data: versions } = useSuspenseQuery(versionsOptions(user.id));
  const { data: apps } = useSuspenseQuery(appsOptions(user.id));
  const { data: subscription } = useSuspenseQuery(subscriptionOptions(user.id));
  const { data: usage } = useSuspenseQuery(usageOptions(user.id));
  const stats = computeApplicationStats(apps);
  const planName = subscription.admin ? "Administrator access" : subscription.active ? subscription.planName : "No active plan";
  return <div className="min-h-screen bg-background"><LandingHeader signedIn />
    <main className="mx-auto max-w-6xl space-y-8 px-5 py-10">
      <PageHeading eyebrow="Your workspace" title="Your next opportunity starts here." description="Welcome back. Keep your resumes and job applications moving forward." actions={<><Button asChild variant="outline"><Link to="/ats-checker"><ScanSearch />Check resume</Link></Button><Button asChild><Link to="/builder"><Sparkles />Create resume</Link></Button></>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={FileText} label="Saved resumes" value={`${versions.length}${versions.length === 50 ? "+" : ""}`} detail="Latest 50 saved versions" />
        <MetricCard icon={Sparkles} label="AI resumes left today" value={usage.resume.remaining} detail={`${usage.resume.used} of ${usage.resume.limit} used · resets in India time`} tone="ai" />
        <MetricCard icon={ScanSearch} label="AI analyses left today" value={usage.analysis.remaining} detail={`${usage.analysis.used} of ${usage.analysis.limit} used · separate from free checker`} />
        <MetricCard icon={Briefcase} label="Applications submitted" value={stats.applied} detail="From your latest 200 tracked entries" tone="success" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <section className="min-w-0"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Recent resumes</h2><Button asChild variant="link"><Link to="/builder">Open builder<ArrowRight /></Link></Button></div>
          {versions.length ? <ul className="mt-4 space-y-3">{versions.slice(0, 5).map(v => <li key={v.id}><Card className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="min-w-0"><h3 className="break-words font-semibold">{v.jobTitle || "Untitled resume"}</h3><p className="mt-1 text-xs text-muted-foreground">{v.company || "Job-specific resume"} · {formatDate(v.createdAt)} · v{v.version}</p><p className="mt-2 text-xs text-muted-foreground">Readiness {v.atsScore ?? "—"}/100 · Job match {v.matchScore ?? "—"}/100</p></div><Button asChild variant="outline" size="sm"><Link to="/builder" search={{ version: v.id }}>Open<ArrowRight /></Link></Button></Card></li>)}</ul> : <EmptyState icon={FileText} title="Your first resume starts here" description="Create a resume from your real skills and experience, tailored to the role you want." actions={<Button asChild><Link to="/builder">Create my resume</Link></Button>} />}
        </section>
        <aside className="min-w-0 space-y-6">
          <Card className="p-5"><div className="flex items-center gap-2 text-primary"><Crown className="h-5 w-5" /><h2 className="font-semibold">Your account</h2></div><p className="mt-4 font-semibold">{planName}</p>{!subscription.admin && subscription.active && <p className="mt-2 text-sm text-muted-foreground">{subscription.creditsRemaining !== null ? `${subscription.creditsRemaining} PDF downloads remaining` : `Valid through ${formatDate(subscription.endDate)}`}</p>}{usage.partner && <p className="mt-2 text-sm">Partner wallet: {usage.partner.balance} credits</p>}<Button asChild variant="outline" className="mt-5 w-full"><Link to="/subscription">Account & payment history</Link></Button></Card>
          <section className="border-t border-border pt-5"><h2 className="font-semibold">Job application tracker</h2><dl className="mt-4 grid grid-cols-3 gap-2 text-sm"><div><dt className="text-muted-foreground">Tracked</dt><dd className="mt-1 text-xl font-semibold">{stats.total}</dd></div><div><dt className="text-muted-foreground">Interviews</dt><dd className="mt-1 text-xl font-semibold">{stats.interviews}</dd></div><div><dt className="text-muted-foreground">Offers</dt><dd className="mt-1 text-xl font-semibold">{stats.offers}</dd></div></dl><Button asChild variant="link" className="mt-3 px-0"><Link to="/tracker">View applications<ArrowRight /></Link></Button></section>
          <section className="border-t border-border pt-5"><h2 className="font-semibold">Saved ATS estimates</h2><p className="mt-2 text-sm text-muted-foreground">Your recent resume versions show their saved readiness and job-match estimates. Public checker results stay in your browser and are not saved as history.</p></section>
        </aside>
      </div>
    </main><LandingFooter signedIn /></div>;
}