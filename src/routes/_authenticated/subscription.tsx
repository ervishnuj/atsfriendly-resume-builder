import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Crown, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentSubscription, getPaymentHistory } from "@/lib/billing.functions";
import { formatINR, formatDate, paymentGateNotice } from "@/lib/billing-shared";
import { LandingFooter } from "@/components/landing/LandingFooter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  clearMyAiResultHistory,
  deleteMyAccount,
  deleteMySavedResumeVersions,
} from "@/lib/account.functions";
import { clearBrowserUserData } from "@/lib/profile-storage";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeading } from "@/components/ui/page-patterns";
import { getMyProfile } from "@/lib/profile-sync.functions";
import { listResumeVersions } from "@/lib/versions.functions";
import { listJobApplications } from "@/lib/applications.functions";
import { listLearningPlans } from "@/lib/learning-plans.functions";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({
    meta: [
      { title: "My Subscription — ATS Resume Builder" },
      {
        name: "description",
        content: "View your active plan, validity dates and complete UPI payment history.",
      },
      { property: "og:title", content: "My Subscription — ATS Resume Builder" },
      { property: "og:description", content: "Your plan status and payment history." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubscriptionPage,
});

const statusColor: Record<string, string> = {
  SUCCESS: "bg-success-soft text-success-foreground",
  PENDING: "bg-warning-soft text-warning-foreground",
  CREATED: "bg-muted text-muted-foreground",
  FAILED: "bg-destructive/10 text-destructive",
  REFUNDED: "bg-accent text-primary",
};

function SubscriptionPage() {
  const { user } = Route.useRouteContext();
  const account = user as { email?: string | null; created_at?: string | null };
  const fetchSub = useServerFn(getCurrentSubscription);
  const fetchPayments = useServerFn(getPaymentHistory);
  const clearAiHistory = useServerFn(clearMyAiResultHistory);
  const removeSavedResumes = useServerFn(deleteMySavedResumeVersions);
  const removeAccount = useServerFn(deleteMyAccount);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [clearingHistory, setClearingHistory] = useState(false);
  const [deletingResumes, setDeletingResumes] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [exporting, setExporting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const fetchProfile = useServerFn(getMyProfile);
  const fetchVersions = useServerFn(listResumeVersions);
  const fetchApps = useServerFn(listJobApplications);
  const fetchPlans = useServerFn(listLearningPlans);

  async function handleExport() {
    setExporting(true);
    try {
      const [profile, resumeVersions, applications, learningPlans, paymentHistory] = await Promise.all([
        fetchProfile(), fetchVersions(), fetchApps(), fetchPlans(), fetchPayments(),
      ]);
      const blob = new Blob([JSON.stringify({
        exportedAt: new Date().toISOString(),
        account: { email: account.email, createdAt: account.created_at },
        profile, resumeVersions, applications, learningPlans, paymentHistory,
      }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `theresumerocket-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data file has been downloaded.");
    } catch {
      toast.error("We couldn't prepare your data file. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handlePasswordReset() {
    if (!account.email) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(account.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSendingReset(false);
    if (error) toast.error("We couldn't send the reset link. Please try again in a few minutes.");
    else toast.success("Password change link requested. Check your inbox.");
  }
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", user.id],
    queryFn: () => fetchSub(),
  });
  const { data: payments } = useQuery({
    queryKey: ["payments", user.id],
    queryFn: () => fetchPayments(),
  });

  async function handleClearAiHistory() {
    setClearingHistory(true);
    try {
      await clearAiHistory();
      toast.success("Stored AI result history deleted. Daily usage counts were preserved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete AI result history.");
    } finally {
      setClearingHistory(false);
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    try {
      await removeAccount();
      await supabase.auth.signOut();
      clearBrowserUserData();
      queryClient.clear();
      navigate({ to: "/", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your account could not be deleted.");
      setDeletingAccount(false);
    }
  }

  async function handleDeleteSavedResumes() {
    setDeletingResumes(true);
    try {
      await removeSavedResumes();
      await queryClient.invalidateQueries({ queryKey: ["resume-versions"] });
      toast.success("Saved resume versions deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete saved resume versions.");
    } finally {
      setDeletingResumes(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <p className="text-lg font-semibold">TheResumeRocket · Account</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/payment">Plans</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/builder">Back to builder</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        <PageHeading eyebrow="Account settings" title="Your account, your control." description="Manage your plan, payment history and private resume data." />
        <Card className="p-6">
          <h2 className="text-sm font-semibold">Account</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="break-all font-medium">{account.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Member since</dt>
              <dd className="font-medium">{account.created_at ? formatDate(account.created_at) : "—"}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => void handlePasswordReset()} disabled={sendingReset || !account.email}>
              {sendingReset && <Loader2 className="h-4 w-4 animate-spin" />}
              Change password
            </Button>
            <Button variant="outline" onClick={() => void handleExport()} disabled={exporting}>
              {exporting && <Loader2 className="h-4 w-4 animate-spin" />}
              Download my data
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Change password emails you a secure link. Download my data saves your profile, resumes, applications, learning plans and payments as a file.
          </p>
        </Card>

        <Card className="p-6">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : subscription?.admin ? (
            <div className="space-y-3">
              <Badge className="gap-1 bg-amber-100 text-amber-900 hover:bg-amber-100">
                <Crown className="h-3.5 w-3.5" /> Admin access
              </Badge>
              <h2 className="text-2xl font-semibold">Unlimited access</h2>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>Unlimited resume features</li>
                <li>No subscription required</li>
                <li>No expiry</li>
              </ul>
              <Button asChild variant="outline" className="mt-2">
                <Link to="/builder">Go to builder</Link>
              </Button>
            </div>
          ) : subscription?.active ? (
            <div className="space-y-2">
              <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                <Crown className="h-3.5 w-3.5" /> Active
              </Badge>
              <h2 className="text-2xl font-semibold">{subscription.planName}</h2>
              {subscription.free ? (
                <p className="text-sm text-muted-foreground">
                  Your account includes one free ATS resume PDF download. It is used automatically
                  with your first successful download — no payment needed.
                </p>
              ) : subscription.creditsRemaining !== null ? (
                <p className="text-sm text-muted-foreground">
                  One-time purchase · {subscription.creditsRemaining} resume PDF download remaining
                  · usable until {formatDate(subscription.endDate)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Valid {formatDate(subscription.startDate)} → {formatDate(subscription.endDate)} ·{" "}
                  {subscription.daysRemaining} day{subscription.daysRemaining === 1 ? "" : "s"}{" "}
                  remaining
                </p>
              )}
              <Button asChild variant="outline" className="mt-3">
                <Link to="/payment">Buy another plan</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const inactive =
                  subscription && subscription.active === false ? subscription : null;
                const notice = paymentGateNotice(inactive?.paymentStatus);
                const toneClass =
                  notice.tone === "info"
                    ? "bg-amber-100 text-amber-900 hover:bg-amber-100"
                    : notice.tone === "warning"
                      ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                      : "bg-destructive/10 text-destructive hover:bg-destructive/10";
                const last = inactive?.lastPayment ?? null;
                return (
                  <>
                    <Badge className={`gap-1 ${toneClass}`}>{notice.status.replace(/_/g, " ")}</Badge>
                    <h2 className="text-xl font-semibold">{notice.title}</h2>
                    <p className="text-sm text-muted-foreground">{notice.description}</p>
                    {last && (
                      <p className="text-sm text-muted-foreground">
                        Last payment: {last.plan} · {formatINR(last.amount)} ·{" "}
                        {formatDate(last.date)}
                        {last.upiReference ? ` · UTR ${last.upiReference}` : ""}
                        {last.adminNote ? ` — ${last.adminNote}` : ""}
                      </p>
                    )}
                    <Button asChild variant={notice.status === "PAYMENT_PENDING" ? "outline" : "default"}>
                      <Link to="/payment">
                        {notice.status === "PAYMENT_PENDING" ? "View plans" : notice.actionLabel}
                      </Link>
                    </Button>
                  </>
                );
              })()}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-semibold">Payment history</h2>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      No payments yet.
                    </TableCell>
                  </TableRow>
                )}
                {(payments ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.date)}</TableCell>
                    <TableCell>{p.plan}</TableCell>
                    <TableCell>{formatINR(p.amount)}</TableCell>
                    <TableCell>{p.paymentMethod}</TableCell>
                    <TableCell className="font-mono text-xs">{p.upiReference ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColor[p.status] ?? ""}>
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-semibold">Your data</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Delete stored AI result bodies without changing daily usage records, or permanently delete
            your account and saved work. Payment records may be retained without a live account link.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={deletingResumes}>
                  {deletingResumes && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delete saved resumes
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all saved resume versions?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes your saved resume versions and their stored job descriptions. Your profile,
                    templates, applications, and current browser draft remain available.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleDeleteSavedResumes()}>
                    Delete saved resumes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={clearingHistory}>
                  {clearingHistory && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delete AI result history
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete stored AI results?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Generated result bodies will be removed. Daily usage counts and limits will not reset.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleClearAiHistory()}>
                    Delete history
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deletingAccount}>
                  {deletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Permanently delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes your profile, saved resumes, templates, applications, and AI history.
                    Payment and audit records may be retained without a live account link. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="confirm-delete">Type DELETE to confirm</Label>
                  <Input id="confirm-delete" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmText("")}>Keep account</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmText.trim() !== "DELETE"}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => void handleDeleteAccount()}
                  >
                    Permanently delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      </main>
      <LandingFooter signedIn />
    </div>
  );
}