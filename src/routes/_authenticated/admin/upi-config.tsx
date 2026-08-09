import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  adminGetUpiConfig,
  adminSaveUpiConfig,
  adminUploadQr,
  amIAdmin,
} from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated/admin/upi-config")({
  head: () => ({
    meta: [
      { title: "Admin · UPI Settings — ATS Resume Builder" },
      { name: "description", content: "Configure the UPI ID and QR code shown at checkout." },
      { property: "og:title", content: "Admin · UPI Settings" },
      { property: "og:description", content: "Configure the UPI ID and QR code shown at checkout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UpiConfigPage,
});

function UpiConfigPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const load = useServerFn(adminGetUpiConfig);
  const save = useServerFn(adminSaveUpiConfig);
  const upload = useServerFn(adminUploadQr);

  const { data: admin, isLoading: checking } = useQuery({
    queryKey: ["am-i-admin", user.id],
    queryFn: () => checkAdmin(),
  });
  const { data: config } = useQuery({
    queryKey: ["admin-upi-config", user.id],
    queryFn: () => load(),
    enabled: admin?.isAdmin === true,
  });

  const [upiId, setUpiId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [active, setActive] = useState(true);
  const [qrPath, setQrPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!config) return;
    setUpiId(config.upi_id ?? "");
    setDisplayName(config.display_name ?? "");
    setInstructions(config.instructions ?? "");
    setActive(config.active ?? true);
    setQrPath(config.qr_image_path ?? null);
  }, [config]);

  const handleFile = async (file: File) => {
    if (file.size > 2_000_000) {
      toast.error("Please upload an image under 2 MB.");
      return;
    }
    const buffer = await file.arrayBuffer();
    let binary = "";
    new Uint8Array(buffer).forEach((b) => {
      binary += String.fromCharCode(b);
    });
    try {
      const res = await upload({
        data: { fileName: file.name, contentType: file.type || "image/png", dataBase64: btoa(binary) },
      });
      setQrPath(res.path);
      toast.success("QR uploaded — remember to save.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleSave = async () => {
    if (upiId.trim().length < 3) {
      toast.error("Enter a valid UPI ID.");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          id: config?.id ?? null,
          upiId: upiId.trim(),
          displayName: displayName.trim(),
          instructions,
          qrImagePath: qrPath,
          active,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-upi-config"] });
      await queryClient.invalidateQueries({ queryKey: ["upi-config"] });
      toast.success("UPI settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
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
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Admin · UPI settings</h1>
          <Button asChild variant="outline">
            <Link to="/admin/payments">Payments</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <Card className="space-y-5 p-6">
          <div>
            <Label htmlFor="upi">UPI ID</Label>
            <Input
              id="upi"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@upi"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="name">Payee display name</Label>
            <Input
              id="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="ATS Resume Builder"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="instructions">Checkout instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              className="mt-2"
              placeholder="Pay the exact amount and paste your UTR below."
            />
          </div>
          <div>
            <Label htmlFor="qr">QR code image</Label>
            <Input
              id="qr"
              type="file"
              accept="image/*"
              className="mt-2"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            {config?.qrUrl && (
              <img
                src={config.qrUrl}
                alt="Current UPI QR code"
                className="mt-3 w-40 rounded-md border border-border bg-background p-2"
              />
            )}
            {qrPath && (
              <p className="mt-2 font-mono text-xs text-muted-foreground">{qrPath}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Switch id="active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="active">Active at checkout</Label>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save settings
          </Button>
        </Card>
      </main>
    </div>
  );
}