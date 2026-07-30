import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, ShieldAlert, ArrowLeft, KeyRound, Trash2 } from "lucide-react";
import {
  adminOverview,
  adminUpdateUserPlan,
  adminGetSettings,
  adminSaveSetting,
  adminDeleteSetting,
  type AdminUserRow,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/config")({
  head: () => ({
    meta: [
      { title: "Admin Configuration — ATS Resume Builder" },
      {
        name: "description",
        content:
          "Super-admin console for managing users, subscriptions, payments and global API configuration.",
      },
      { property: "og:title", content: "Admin Configuration — ATS Resume Builder" },
      {
        property: "og:description",
        content: "Manage users, subscriptions, payments and global API keys.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminConfig,
});

type Overview = Awaited<ReturnType<typeof adminOverview>>;
type Setting = Awaited<ReturnType<typeof adminGetSettings>>[number];

function AdminConfig() {
  const navigate = useNavigate();
  const load = useServerFn(adminOverview);
  const loadSettings = useServerFn(adminGetSettings);
  const updatePlan = useServerFn(adminUpdateUserPlan);
  const saveSetting = useServerFn(adminSaveSetting);
  const deleteSetting = useServerFn(adminDeleteSetting);

  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Overview | null>(null);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [search, setSearch] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const refresh = useCallback(
    async (term = "") => {
      setLoading(true);
      try {
        const [overview, s] = await Promise.all([
          load({ data: { search: term } }),
          loadSettings({ data: undefined }),
        ]);
        setData(overview);
        setSettings(s);
        setDenied(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load";
        if (msg.includes("403")) setDenied(true);
        else toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [load, loadSettings],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (denied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="max-w-md p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <h1 className="text-xl font-semibold">403 — Unauthorized</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This configuration console is restricted to the super admin account.
          </p>
          <Button className="mt-6" onClick={() => navigate({ to: "/builder" })}>
            Back to builder
          </Button>
        </Card>
      </div>
    );
  }

  type PlanUpdate = {
    targetUserId: string;
    isUnlimited?: boolean;
    extendDays?: number;
    clearSubscription?: boolean;
    resetUsage?: boolean;
  };

  const act = async (payload: PlanUpdate) => {
    try {
      await updatePlan({ data: payload });
      toast.success("User plan updated.");
      await refresh(search);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster richColors position="top-right" />
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Admin Configuration</h1>
              <p className="text-xs text-muted-foreground">Super admin console</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="gap-1">
            <Link to="/builder">
              <ArrowLeft className="h-4 w-4" /> Builder
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-6 px-6 py-6">
        {loading && !data ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          data && (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Registered users" value={data.stats.totalUsers} />
                <StatCard label="Active subscribers" value={data.stats.activeSubscribers} />
                <StatCard
                  label="Total payments"
                  value={`₹${data.stats.totalPaid.toLocaleString()}`}
                />
                <StatCard label="Generations today" value={data.stats.generationsToday} />
              </div>
              <Tabs defaultValue="users">
                <TabsList>
                  <TabsTrigger value="users">Users</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="settings">System settings</TabsTrigger>
                </TabsList>
                <TabsContent value="users" className="mt-4 space-y-4">
                  <Card className="p-4">
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void refresh(search);
                      }}
                    >
                      <Input
                        value={search}
                        maxLength={200}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by email..."
                      />
                      <Button type="submit" variant="secondary">
                        Search
                      </Button>
                    </form>
                  </Card>
                  <div className="space-y-3">
                    {data.users.map((u: AdminUserRow) => (
                      <Card key={u.id} className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{u.email}</span>
                              {u.role === "admin" && <Badge>admin</Badge>}
                              {u.is_unlimited && <Badge variant="secondary">unlimited</Badge>}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Usage today: {u.daily_usage_count} · Subscription:{" "}
                              {u.subscription_expires_at
                                ? new Date(u.subscription_expires_at).toLocaleDateString()
                                : "none"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 text-xs">
                              <Switch
                                checked={u.is_unlimited}
                                onCheckedChange={(checked) =>
                                  act({ targetUserId: u.id, isUnlimited: checked })
                                }
                              />
                              Unlimited
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => act({ targetUserId: u.id, extendDays: 30 })}
                            >
                              +30 days
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => act({ targetUserId: u.id, extendDays: 365 })}
                            >
                              +1 year
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => act({ targetUserId: u.id, resetUsage: true })}
                            >
                              Reset usage
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => act({ targetUserId: u.id, clearSubscription: true })}
                            >
                              Revoke plan
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                    {data.users.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No users found.
                      </p>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="payments" className="mt-4">
                  <Card className="divide-y divide-border">
                    {data.transactions.length === 0 && (
                      <p className="p-8 text-center text-sm text-muted-foreground">
                        No transactions recorded yet.
                      </p>
                    )}
                    {data.transactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-4 p-4">
                        <div>
                          <p className="text-sm font-medium">
                            {t.currency} {Number(t.amount).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t.payment_id ?? "—"} · {new Date(t.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="secondary">{t.status}</Badge>
                      </div>
                    ))}
                  </Card>
                </TabsContent>
                <TabsContent value="settings" className="mt-4 space-y-4">
                  <Card className="p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                      <h2 className="text-sm font-semibold">
                        Global API &amp; payment gateway keys
                      </h2>
                    </div>
                    <p className="mb-4 text-xs text-muted-foreground">
                      Values are encrypted with AES-256 before storage and are never returned in
                      full to the browser.
                    </p>
                    <form
                      className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          await saveSetting({
                            data: { key: newKey, value: newValue, description: newDesc },
                          });
                          setNewKey("");
                          setNewValue("");
                          setNewDesc("");
                          toast.success("Setting saved.");
                          await refresh(search);
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Save failed");
                        }
                      }}
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor="k">Key</Label>
                        <Input
                          id="k"
                          required
                          value={newKey}
                          maxLength={64}
                          onChange={(e) => setNewKey(e.target.value)}
                          placeholder="RAZORPAY_KEY_ID"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="v">Value</Label>
                        <Input
                          id="v"
                          required
                          type="password"
                          value={newValue}
                          maxLength={5000}
                          onChange={(e) => setNewValue(e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="d">Description</Label>
                        <Input
                          id="d"
                          value={newDesc}
                          maxLength={200}
                          onChange={(e) => setNewDesc(e.target.value)}
                          placeholder="Payment gateway key id"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button type="submit">Save</Button>
                      </div>
                    </form>
                  </Card>
                  <Card className="divide-y divide-border">
                    {settings.length === 0 && (
                      <p className="p-8 text-center text-sm text-muted-foreground">
                        No global settings stored yet.
                      </p>
                    )}
                    {settings.map((s) => (
                      <div key={s.key} className="flex items-center justify-between gap-4 p-4">
                        <div>
                          <p className="font-mono text-sm">{s.key}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.masked || "empty"} · {s.description ?? "no description"}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-destructive hover:text-destructive"
                          onClick={async () => {
                            await deleteSetting({ data: { key: s.key } });
                            toast.success("Setting removed.");
                            await refresh(search);
                          }}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </Button>
                      </div>
                    ))}
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </Card>
  );
}