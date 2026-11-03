import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Loader2, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminListPackages,
  adminSavePackage,
  adminSetNegotiatedPrice,
  adminListPartners,
} from "@/lib/partners.functions";
import { amIAdmin } from "@/lib/billing.functions";
import { formatINR } from "@/lib/billing-shared";
import { costPerCredit } from "@/lib/partner-math";

export const Route = createFileRoute("/_authenticated/admin/partner-packages")({
  head: () => ({
    meta: [
      { title: "Admin · Partner Packages — ATS Resume Builder" },
      { name: "description", content: "Manage prepaid reseller credit packages and negotiated prices." },
      { property: "og:title", content: "Admin · Partner Packages" },
      { property: "og:description", content: "Manage prepaid reseller credit packages and negotiated prices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPartnerPackages,
});

type PackageForm = { name: string; credits: string; priceInr: string; sortOrder: string; active: boolean };
const emptyForm: PackageForm = { name: "", credits: "", priceInr: "", sortOrder: "0", active: true };

function AdminPartnerPackages() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const listPackages = useServerFn(adminListPackages);
  const savePackage = useServerFn(adminSavePackage);
  const setPrice = useServerFn(adminSetNegotiatedPrice);
  const listPartners = useServerFn(adminListPartners);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PackageForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [negoPartnerId, setNegoPartnerId] = useState("");
  const [negoPackageId, setNegoPackageId] = useState("");
  const [negoPrice, setNegoPrice] = useState("");

  const { data: admin, isLoading: checking } = useQuery({
    queryKey: ["am-i-admin", user.id],
    queryFn: () => checkAdmin(),
  });
  const { data: packages, isLoading } = useQuery({
    queryKey: ["admin-partner-packages"],
    queryFn: () => listPackages(),
    enabled: admin?.isAdmin === true,
  });
  const { data: partners } = useQuery({
    queryKey: ["admin-partners", user.id],
    queryFn: () => listPartners(),
    enabled: admin?.isAdmin === true,
  });

  const save = async () => {
    const credits = Number.parseInt(form.credits, 10);
    const price = Number(form.priceInr);
    if (!form.name.trim() || !Number.isInteger(credits) || credits < 1 || !Number.isFinite(price) || price < 0) {
      toast.error("Enter a name, a positive credit count and a valid price.");
      return;
    }
    setBusy(true);
    try {
      await savePackage({
        data: {
          id: editingId ?? undefined,
          name: form.name,
          credits,
          priceInr: price,
          active: form.active,
          sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
        },
      });
      toast.success(editingId ? "Package updated." : "Package created.");
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-partner-packages"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const saveNegotiated = async () => {
    if (!negoPartnerId || !negoPackageId) {
      toast.error("Choose a partner and a package.");
      return;
    }
    const price = negoPrice.trim() === "" ? null : Number(negoPrice);
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      toast.error("Enter a valid price, or leave empty to remove the override.");
      return;
    }
    setBusy(true);
    try {
      await setPrice({ data: { partnerId: negoPartnerId, packageId: negoPackageId, priceInr: price } });
      toast.success(price === null ? "Negotiated price removed." : "Negotiated price saved.");
      setNegoPrice("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!admin?.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card className="max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold">Admin access only</h1>
          <Button asChild className="mt-4">
            <Link to="/builder">Back to builder</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster richColors position="top-right" />
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Admin · Partner Packages</h1>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/partners">Partners</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/partner-billing">Billing</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/partner-reports">Reports</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Prepaid reseller credit packages.</p>
          <Button
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> New package
          </Button>
        </div>

        <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Cost / credit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )}
              {(packages ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.credits}</TableCell>
                  <TableCell>{formatINR(p.priceInr)}</TableCell>
                  <TableCell>{formatINR(costPerCredit(p.priceInr, p.credits))}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={p.active ? "bg-emerald-100 text-emerald-800" : ""}>
                      {p.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(p.id);
                        setForm({
                          name: p.name,
                          credits: String(p.credits),
                          priceInr: String(p.priceInr),
                          sortOrder: String(p.sortOrder),
                          active: p.active,
                        });
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold">Partner-specific negotiated price</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Overrides the package price for one partner only. Leave the price empty to remove an override.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Select value={negoPartnerId} onValueChange={setNegoPartnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Partner" />
              </SelectTrigger>
              <SelectContent>
                {(partners ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.businessName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={negoPackageId} onValueChange={setNegoPackageId}>
              <SelectTrigger>
                <SelectValue placeholder="Package" />
              </SelectTrigger>
              <SelectContent>
                {(packages ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              placeholder="Price ₹ (empty = remove)"
              value={negoPrice}
              onChange={(e) => setNegoPrice(e.target.value)}
            />
            <Button onClick={saveNegotiated} disabled={busy}>
              Save override
            </Button>
          </div>
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit package" : "New package"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="pkg-name">Name</Label>
              <Input id="pkg-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pkg-credits">Credits</Label>
                <Input
                  id="pkg-credits"
                  type="number"
                  min={1}
                  value={form.credits}
                  onChange={(e) => setForm({ ...form, credits: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="pkg-price">Price (₹)</Label>
                <Input
                  id="pkg-price"
                  type="number"
                  min={0}
                  value={form.priceInr}
                  onChange={(e) => setForm({ ...form, priceInr: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="pkg-sort">Sort order</Label>
              <Input
                id="pkg-sort"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} id="pkg-active" />
              <Label htmlFor="pkg-active">Active (visible to partners)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {editingId ? "Save changes" : "Create package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
