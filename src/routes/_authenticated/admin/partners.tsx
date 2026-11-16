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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminListPartners,
  adminCreatePartner,
  adminUpdatePartner,
} from "@/lib/partners.functions";
import { amIAdmin } from "@/lib/billing.functions";
import { formatINR, formatDate } from "@/lib/billing-shared";

export const Route = createFileRoute("/_authenticated/admin/partners")({
  head: () => ({
    meta: [
      { title: "Admin · Partners — ATS Resume Builder" },
      { name: "description", content: "Manage reseller partner accounts and credit limits." },
      { property: "og:title", content: "Admin · Partners" },
      { property: "og:description", content: "Manage reseller partner accounts and credit limits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPartners,
});

const CATEGORY_LABELS: Record<string, string> = {
  coaching_centre: "Coaching Centre",
  browsing_centre: "Browsing Centre",
  xerox_printing: "Xerox / Printing Centre",
  job_consultancy: "Job Consultancy",
  training_institute: "Training Institute",
  other: "Other",
};

const statusColor: Record<string, string> = {
  active: "bg-success-soft text-success-foreground",
  inactive: "bg-muted text-muted-foreground",
  suspended: "bg-destructive/10 text-destructive",
};

type PartnerForm = {
  businessName: string;
  contactPerson: string;
  phone: string;
  email: string;
  location: string;
  category: string;
  dailyCreditLimit: string;
};

const emptyForm: PartnerForm = {
  businessName: "",
  contactPerson: "",
  phone: "",
  email: "",
  location: "",
  category: "coaching_centre",
  dailyCreditLimit: "30",
};

function AdminPartners() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const list = useServerFn(adminListPartners);
  const create = useServerFn(adminCreatePartner);
  const update = useServerFn(adminUpdatePartner);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PartnerForm>(emptyForm);
  const [sellingPrice, setSellingPrice] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: admin, isLoading: checking } = useQuery({
    queryKey: ["am-i-admin", user.id],
    queryFn: () => checkAdmin(),
  });
  const { data: partners, isLoading } = useQuery({
    queryKey: ["admin-partners", user.id],
    queryFn: () => list(),
    enabled: admin?.isAdmin === true,
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSellingPrice("");
    setDialogOpen(true);
  };

  const openEdit = (p: NonNullable<typeof partners>[number]) => {
    setEditingId(p.id);
    setForm({
      businessName: p.businessName,
      contactPerson: p.contactPerson,
      phone: p.phone,
      email: p.email,
      location: p.location,
      category: p.category,
      dailyCreditLimit: String(p.dailyCreditLimit),
    });
    setSellingPrice(p.sellingPrice === null ? "" : String(p.sellingPrice));
    setDialogOpen(true);
  };

  const save = async () => {
    const limit = Number.parseInt(form.dailyCreditLimit, 10);
    if (!form.businessName.trim() || !form.email.trim()) {
      toast.error("Business name and email are required.");
      return;
    }
    if (!Number.isInteger(limit) || limit < 1) {
      toast.error("Daily credit limit must be a positive number.");
      return;
    }
    setBusy(true);
    try {
      const price = sellingPrice.trim() === "" ? null : Number(sellingPrice);
      if (editingId) {
        await update({
          data: {
            id: editingId,
            businessName: form.businessName,
            contactPerson: form.contactPerson,
            phone: form.phone,
            email: form.email,
            location: form.location,
            category: form.category as never,
            dailyCreditLimit: limit,
            sellingPrice: price,
          },
        });
        toast.success("Partner updated.");
      } else {
        const result = await create({
          data: {
            businessName: form.businessName,
            contactPerson: form.contactPerson,
            phone: form.phone,
            email: form.email,
            location: form.location,
            category: form.category as never,
            dailyCreditLimit: limit,
          },
        });
        toast.success(`Partner created with code ${result.partnerCode}.`);
      }
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id: string, status: "active" | "inactive" | "suspended") => {
    try {
      await update({ data: { id, status } });
      await queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      toast.success(`Partner marked ${status}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
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
          <p className="mt-2 text-sm text-muted-foreground">
            This dashboard is restricted to the application administrator.
          </p>
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
          <h1 className="text-lg font-semibold tracking-tight">Admin · Partners</h1>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/partner-packages">Packages</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/partner-billing">Billing</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/partner-reports">Reports</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/builder">Builder</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {partners?.length ?? 0} partner account{(partners?.length ?? 0) === 1 ? "" : "s"}
          </p>
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> New partner
          </Button>
        </div>

        <Card className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Daily limit</TableHead>
                  <TableHead>Selling price</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && (partners ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-sm text-muted-foreground">
                      No partners yet. Create the first one to start reselling.
                    </TableCell>
                  </TableRow>
                )}
                {(partners ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.businessName}</div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.partnerCode}</TableCell>
                    <TableCell className="text-sm">{CATEGORY_LABELS[p.category] ?? p.category}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColor[p.status] ?? ""}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.wallet.balance} <span className="text-muted-foreground">/ {p.wallet.lifetimePurchased}</span>
                    </TableCell>
                    <TableCell>{p.dailyCreditLimit}</TableCell>
                    <TableCell>{p.sellingPrice === null ? "—" : formatINR(p.sellingPrice)}</TableCell>
                    <TableCell className="text-sm">{formatDate(p.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {p.status !== "active" && (
                          <Button size="sm" onClick={() => setStatus(p.id, "active")}>
                            Activate
                          </Button>
                        )}
                        {p.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => setStatus(p.id, "suspended")}>
                            Suspend
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit partner" : "New partner"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="p-name">Business / centre name</Label>
              <Input
                id="p-name"
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="p-contact">Contact person</Label>
              <Input
                id="p-contact"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="p-phone">Phone</Label>
              <Input
                id="p-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="p-email">Email</Label>
              <Input
                id="p-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="p-location">Location</Label>
              <Input
                id="p-location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="p-limit">Daily credit limit</Label>
              <Input
                id="p-limit"
                type="number"
                min={1}
                value={form.dailyCreditLimit}
                onChange={(e) => setForm({ ...form, dailyCreditLimit: e.target.value })}
              />
            </div>
            {editingId && (
              <div className="sm:col-span-2">
                <Label htmlFor="p-price">Customer selling price (₹, within admin min/max)</Label>
                <Input
                  id="p-price"
                  type="number"
                  min={0}
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="e.g. 39"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {editingId ? "Save changes" : "Create partner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
