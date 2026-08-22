import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, ArrowDown, ArrowUp, Copy, Palette, Pencil, Plus, Trash2 } from "lucide-react";
import { ResumePreview } from "@/components/ResumePreview";
import type { OptimizedResume } from "@/lib/resume.functions";
import {
  ATS_CLASSIC,
  BUILTIN_TEMPLATES,
  FONT_CHOICES,
  SECTION_LABELS,
  atsWarnings,
  type SectionKey,
  type TemplateConfig,
} from "@/lib/resume-templates";
import {
  deleteMyTemplate,
  listMyTemplates,
  saveMyTemplate,
  type SavedTemplate,
} from "@/lib/templates.functions";

/** Placeholder content so thumbnails render before a resume is generated. */
const SAMPLE: OptimizedResume = {
  atsScore: 0,
  matchingKeywords: [],
  missingKeywords: [],
  optimizedProfile: {
    personal: {
      fullName: "Alex Kumar",
      title: "Software Engineer",
      email: "alex@example.com",
      phone: "+91 90000 00000",
      linkedin: "linkedin.com/in/alex",
      github: "github.com/alex",
      portfolio: "",
      summary:
        "Backend engineer with experience building and debugging production Java services, REST APIs and SQL-backed integrations.",
    },
    skills: [
      { category: "Languages", items: ["Java", "SQL", "JavaScript"] },
      { category: "Frameworks", items: ["Spring Boot", "React"] },
    ],
    experience: [
      {
        title: "Software Debug Engineer",
        company: "Zoho Corporation",
        dateRange: "Jan 2023 – Present",
        bullets: [
          "Debugged and resolved production issues using Java, SQL and log analysis.",
          "Performed root-cause analysis for customer-impacting incidents.",
        ],
      },
    ],
    education: [
      { degree: "B.E.", major: "Computer Science", institution: "Anna University", year: "2022", score: "" },
    ],
  },
};

type Props = {
  data: OptimizedResume | null;
  templateId: string;
  config: TemplateConfig;
  onSelect: (id: string, config: TemplateConfig) => void;
};

export function TemplateStudio({ data, templateId, config, onSelect }: Props) {
  const queryClient = useQueryClient();
  const fetchTemplates = useServerFn(listMyTemplates);
  const persist = useServerFn(saveMyTemplate);
  const remove = useServerFn(deleteMyTemplate);
  const { data: custom = [] } = useQuery({
    queryKey: ["resume-templates"],
    queryFn: () => fetchTemplates(),
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TemplateConfig>(ATS_CLASSIC);
  const [name, setName] = useState("My Custom Template");
  const [pendingDelete, setPendingDelete] = useState<SavedTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  // Selection to restore if the user cancels/dismisses the editor.
  const [prevSelection, setPrevSelection] = useState<{ id: string; config: TemplateConfig } | null>(
    null,
  );

  const preview = data ?? SAMPLE;

  // Live preview: while the editor is open the main A4 preview follows the draft.
  useEffect(() => {
    if (editorOpen) onSelect(editingId ? `custom:${editingId}` : "custom:draft", draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, editorOpen]);

  const warnings = useMemo(() => atsWarnings(draft), [draft]);
  const set = <K extends keyof TemplateConfig>(k: K, v: TemplateConfig[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const openNew = (base: TemplateConfig = config, id: string | null = null, label?: string) => {
    setPrevSelection({ id: templateId, config });
    setDraft({ ...base });
    setEditingId(id);
    setName(label ?? `${base.templateName} (custom)`);
    setEditorOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await persist({ data: { id: editingId, name, config: draft } });
      await queryClient.invalidateQueries({ queryKey: ["resume-templates"] });
      setEditorOpen(false);
      setPrevSelection(null);
      setEditingId(saved.id);
      onSelect(`custom:${saved.id}`, saved.config);
      toast.success(`Template "${saved.name}" saved to My Custom Templates.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the template.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await remove({ data: { id: pendingDelete.id } });
      await queryClient.invalidateQueries({ queryKey: ["resume-templates"] });
      if (templateId === `custom:${pendingDelete.id}`) onSelect("ats-classic", ATS_CLASSIC);
      toast.success("Template deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the template.");
    } finally {
      setPendingDelete(null);
    }
  };

  const moveSection = (key: SectionKey, dir: -1 | 1) =>
    setDraft((d) => {
      const order = [...d.sectionOrder];
      const i = order.indexOf(key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= order.length) return d;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...d, sectionOrder: order };
    });

  return (
    <Card className="p-4 print:hidden">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Resume Templates</h2>
          <p className="text-xs text-muted-foreground">
            The selected template controls the preview and the exported PDF.
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => openNew()}>
          <Plus className="h-4 w-4" /> Create Custom Template
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BUILTIN_TEMPLATES.map((t) => (
          <ThumbCard
            key={t.id}
            active={templateId === t.id}
            title={t.name}
            subtitle={t.description}
            badge={t.id === "ats-classic" ? "Default" : undefined}
            onClick={() => onSelect(t.id, t.config)}
          >
            <ResumePreview data={preview} config={t.config} scale={0.19} />
          </ThumbCard>
        ))}
      </div>

      <div className="mt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          My Custom Templates
        </h3>
        {custom.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No custom templates yet. Click <span className="font-medium">Create Custom Template</span> to design one.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {custom.map((t) => (
              <ThumbCard
                key={t.id}
                active={templateId === `custom:${t.id}`}
                title={t.name}
                subtitle="Custom"
                onClick={() => onSelect(`custom:${t.id}`, t.config)}
                actions={
                  <div className="flex flex-wrap gap-1">
                    <IconBtn label="Edit" onClick={() => openNew(t.config, t.id, t.name)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn
                      label="Duplicate"
                      onClick={() => openNew(t.config, null, `${t.name} copy`)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn label="Delete" destructive onClick={() => setPendingDelete(t)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconBtn>
                  </div>
                }
              >
                <ResumePreview data={preview} config={t.config} scale={0.19} />
              </ThumbCard>
            ))}
          </div>
        )}
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-4 w-4" /> Custom template builder
            </DialogTitle>
            <DialogDescription>
              Every change updates the A4 preview instantly. Layout stays single-column and ATS-safe.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 md:grid-cols-[1fr_auto]">
            <div className="space-y-5">
              <Field label="Template name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Java Resume" />
              </Field>

              <Group title="Typography">
                <Field label="Font family">
                  <Select value={draft.fontFamily} onValueChange={(v) => set("fontFamily", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_CHOICES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Num label="Body size" unit="pt" value={draft.bodyFontSize} min={8} max={13} step={0.5} onChange={(v) => set("bodyFontSize", v)} />
                <Num label="Name size" unit="pt" value={draft.nameFontSize} min={12} max={30} step={1} onChange={(v) => set("nameFontSize", v)} />
                <Num label="Heading size" unit="pt" value={draft.headingFontSize} min={9} max={16} step={0.5} onChange={(v) => set("headingFontSize", v)} />
                <Num label="Heading weight" value={draft.headingWeight} min={500} max={800} step={100} onChange={(v) => set("headingWeight", v)} />
                <Num label="Line height" value={draft.lineHeight} min={1} max={1.8} step={0.05} onChange={(v) => set("lineHeight", v)} />
              </Group>

              <Group title="Colors">
                <Color label="Text" value={draft.textColor} onChange={(v) => set("textColor", v)} />
                <Color label="Heading" value={draft.headingColor} onChange={(v) => set("headingColor", v)} />
                <Color label="Accent" value={draft.accentColor} onChange={(v) => set("accentColor", v)} />
                <Color label="Divider" value={draft.dividerColor} onChange={(v) => set("dividerColor", v)} />
              </Group>

              <Group title="Spacing">
                <Num label="Margin top" unit="mm" value={draft.marginTop} min={5} max={30} step={1} onChange={(v) => set("marginTop", v)} />
                <Num label="Margin bottom" unit="mm" value={draft.marginBottom} min={5} max={30} step={1} onChange={(v) => set("marginBottom", v)} />
                <Num label="Margin left" unit="mm" value={draft.marginLeft} min={5} max={30} step={1} onChange={(v) => set("marginLeft", v)} />
                <Num label="Margin right" unit="mm" value={draft.marginRight} min={5} max={30} step={1} onChange={(v) => set("marginRight", v)} />
                <Num label="Section spacing" unit="px" value={draft.sectionSpacing} min={4} max={28} step={1} onChange={(v) => set("sectionSpacing", v)} />
                <Num label="Experience spacing" unit="px" value={draft.itemSpacing} min={2} max={24} step={1} onChange={(v) => set("itemSpacing", v)} />
                <Num label="Bullet spacing" unit="px" value={draft.bulletSpacing} min={0} max={10} step={1} onChange={(v) => set("bulletSpacing", v)} />
              </Group>

              <Group title="Header">
                <Field label="Alignment">
                  <Select
                    value={draft.headerAlignment}
                    onValueChange={(v) => set("headerAlignment", v as TemplateConfig["headerAlignment"])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Contact layout">
                  <Select
                    value={draft.contactLayout}
                    onValueChange={(v) => set("contactLayout", v as TemplateConfig["contactLayout"])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inline">Single line (separated)</SelectItem>
                      <SelectItem value="stacked">Stacked lines</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Toggle label="Uppercase section titles" checked={draft.uppercaseHeadings} onChange={(v) => set("uppercaseHeadings", v)} />
                <Toggle label="Show divider lines" checked={draft.showDividers} onChange={(v) => set("showDividers", v)} />
              </Group>

              <Group title="Sections">
                <div className="col-span-full space-y-2">
                  {draft.sectionOrder.map((key) => (
                    <div key={key} className="flex items-center justify-between gap-2 rounded-md border p-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={draft.sections[key]}
                          onCheckedChange={(v) =>
                            setDraft((d) => ({ ...d, sections: { ...d.sections, [key]: v } }))
                          }
                          aria-label={`Show ${SECTION_LABELS[key]}`}
                        />
                        <span className="text-sm">{SECTION_LABELS[key]}</span>
                      </div>
                      <div className="flex gap-1">
                        <IconBtn label="Move up" onClick={() => moveSection(key, -1)}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn label="Move down" onClick={() => moveSection(key, 1)}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </IconBtn>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Layout is fixed to a single column — the only ATS-safe structure for core content.
                  </p>
                </div>
              </Group>

              <Group title="Footer">
                <Toggle label="Show footer" checked={draft.showFooter} onChange={(v) => set("showFooter", v)} />
                <Field label="Footer text">
                  <Input
                    value={draft.footerText}
                    onChange={(e) => set("footerText", e.target.value)}
                    placeholder="References available on request"
                  />
                </Field>
              </Group>

              {warnings.length > 0 && (
                <div role="status" className="rounded-md border border-amber-300/70 bg-amber-50 p-3 dark:bg-amber-950/20">
                  <p className="flex items-center gap-1 text-sm font-semibold">
                    <AlertTriangle className="h-4 w-4" /> Warning: this customization may reduce ATS readability.
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                    {warnings.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div className="hidden shrink-0 md:block">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Live preview</p>
              <div className="rounded-md border bg-white p-1">
                <ResumePreview data={preview} config={draft} scale={0.32} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pendingDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the template from your account. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function ThumbCard({
  active,
  title,
  subtitle,
  badge,
  onClick,
  children,
  actions,
}: {
  active: boolean;
  title: string;
  subtitle?: string;
  badge?: string;
  onClick: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border p-2 transition ${active ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/50"}`}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={`Use the ${title} template`}
        className="block w-full overflow-hidden rounded bg-white"
      >
        <div className="mx-auto w-fit">{children}</div>
      </button>
      <div className="mt-2 flex items-center justify-between gap-1">
        <p className="truncate text-xs font-medium">{title}</p>
        {badge && <Badge variant="secondary" className="text-[10px]">{badge}</Badge>}
      </div>
      {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
      {actions && <div className="mt-1">{actions}</div>}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
  destructive,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`h-6 px-2 ${destructive ? "text-destructive hover:text-destructive" : ""}`}
    >
      {children}
    </Button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Num({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}{unit ?? ""}</span>
      </Label>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          aria-label={`${label} color`}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border bg-transparent"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8" />
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border p-2">
      <Label className="text-xs">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
