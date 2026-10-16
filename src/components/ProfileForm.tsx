import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, User, Wrench, Briefcase, GraduationCap } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

export type Profile = {
  personal: {
    fullName: string;
    title: string;
    email: string;
    phone: string;
    linkedin: string;
    github: string;
    portfolio: string;
    summary: string;
  };
  skills: { category: string; items: string[] }[];
  experience: {
    title: string;
    company: string;
    dateRange: string;
    bullets: string[];
  }[];
  education: {
    degree: string;
    major: string;
    institution: string;
    year: string;
    score: string;
  }[];
};

export const emptyProfile: Profile = {
  personal: {
    fullName: "",
    title: "",
    email: "",
    phone: "",
    linkedin: "",
    github: "",
    portfolio: "",
    summary: "",
  },
  skills: [{ category: "Technical Skills", items: [] }],
  experience: [{ title: "", company: "", dateRange: "", bullets: [""] }],
  education: [{ degree: "", major: "", institution: "", year: "", score: "" }],
};

type Props = {
  profile: Profile;
  setProfile: Dispatch<SetStateAction<Profile>>;
  /** Map of field path (e.g. "experience.0.title") -> error message. */
  fieldErrors?: Record<string, string>;
};

export function ProfileForm({ profile, setProfile, fieldErrors = {} }: Props) {
  const p = profile;
  const err = (path: string) => fieldErrors[path];
  const setPersonal = (k: keyof Profile["personal"], v: string) =>
    setProfile((s) => ({ ...s, personal: { ...s.personal, [k]: v } }));

  return (
    <Accordion
      type="multiple"
      defaultValue={["personal", "skills", "experience", "education"]}
      className="w-full"
    >
      <AccordionItem value="personal">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            <User className="h-4 w-4" /> Personal Info
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pt-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field path="personal.fullName" error={err("personal.fullName")} label="Full Name" value={p.personal.fullName} onChange={(v) => setPersonal("fullName", v)} />
            <Field path="personal.title" error={err("personal.title")} label="Professional Title" value={p.personal.title} onChange={(v) => setPersonal("title", v)} />
            <Field type="email" autoComplete="email" path="personal.email" error={err("personal.email")} label="Email" value={p.personal.email} onChange={(v) => setPersonal("email", v)} />
            <Field type="tel" autoComplete="tel" path="personal.phone" error={err("personal.phone")} label="Phone" value={p.personal.phone} onChange={(v) => setPersonal("phone", v)} />
            <Field type="url" path="personal.linkedin" error={err("personal.linkedin")} label="LinkedIn URL" value={p.personal.linkedin} onChange={(v) => setPersonal("linkedin", v)} />
            <Field type="url" path="personal.github" error={err("personal.github")} label="GitHub URL" value={p.personal.github} onChange={(v) => setPersonal("github", v)} />
            <div className="sm:col-span-2">
              <Field type="url" path="personal.portfolio" error={err("personal.portfolio")} label="Portfolio / Website" value={p.personal.portfolio} onChange={(v) => setPersonal("portfolio", v)} />
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-xs">Short Summary (optional — AI will rewrite)</Label>
            <Textarea
              rows={3}
              value={p.personal.summary}
              onChange={(e) => setPersonal("summary", e.target.value)}
              placeholder="A few sentences about your background..."
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="skills">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Skills
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pt-2">
          {p.skills.map((s, i) => (
            <div key={i} className="rounded-md border border-border p-3">
              <div className="mb-2 flex items-center gap-2">
                <Input
                  id={`field-skills.${i}.category`}
                  aria-invalid={!!err(`skills.${i}.category`)}
                  className={err(`skills.${i}.category`) ? ERROR_RING : undefined}
                  value={s.category}
                  onChange={(e) =>
                    setProfile((prev) => {
                      const next = { ...prev, skills: [...prev.skills] };
                      next.skills[i] = { ...next.skills[i], category: e.target.value };
                      return next;
                    })
                  }
                  placeholder="Category (e.g. Frameworks)"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete skill group"
                  onClick={() =>
                    setProfile((prev) => ({
                      ...prev,
                      skills: prev.skills.filter((_, idx) => idx !== i),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {err(`skills.${i}.category`) && <ErrorText>{err(`skills.${i}.category`)}</ErrorText>}
              <Textarea
                id={`field-skills.${i}.items`}
                aria-invalid={!!err(`skills.${i}.items`)}
                className={err(`skills.${i}.items`) ? ERROR_RING : undefined}
                rows={2}
                value={s.items.join(", ")}
                onChange={(e) =>
                  setProfile((prev) => {
                    const next = { ...prev, skills: [...prev.skills] };
                    next.skills[i] = {
                      ...next.skills[i],
                      items: e.target.value
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    };
                    return next;
                  })
                }
                 placeholder="Comma-separated (Java, Spring Boot — Currently Learning)"
              />
              {err(`skills.${i}.items`) && <ErrorText>{err(`skills.${i}.items`)}</ErrorText>}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setProfile((prev) => ({
                ...prev,
                skills: [...prev.skills, { category: "", items: [] }],
              }))
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add category
          </Button>
           <p className="text-xs text-muted-foreground">For skills you are studying, add “— Currently Learning” or “— Currently Training” to the skill. Add real projects under Experience / Projects.</p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="experience">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Experience / Projects
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          {p.experience.map((e, i) => (
            <div key={i} className="space-y-2 rounded-md border border-border p-3">
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete experience entry"
                  onClick={() =>
                    setProfile((prev) => ({
                      ...prev,
                      experience: prev.experience.filter((_, idx) => idx !== i),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field
                  path={`experience.${i}.title`}
                  error={err(`experience.${i}.title`)}
                  label="Title / Role"
                  value={e.title}
                  onChange={(v) =>
                    setProfile((prev) => {
                      const next = { ...prev, experience: [...prev.experience] };
                      next.experience[i] = { ...next.experience[i], title: v };
                      return next;
                    })
                  }
                />
                <Field
                  path={`experience.${i}.company`}
                  error={err(`experience.${i}.company`)}
                  label="Company / Project"
                  value={e.company}
                  onChange={(v) =>
                    setProfile((prev) => {
                      const next = { ...prev, experience: [...prev.experience] };
                      next.experience[i] = { ...next.experience[i], company: v };
                      return next;
                    })
                  }
                />
                <div className="col-span-2">
                  <Field
                    path={`experience.${i}.dateRange`}
                    error={err(`experience.${i}.dateRange`)}
                    label="Date Range"
                    value={e.dateRange}
                    onChange={(v) =>
                      setProfile((prev) => {
                        const next = { ...prev, experience: [...prev.experience] };
                        next.experience[i] = { ...next.experience[i], dateRange: v };
                        return next;
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1 block text-xs">Key Responsibilities / Achievements (one per line)</Label>
                <Textarea
                  id={`field-experience.${i}.bullets`}
                  aria-invalid={!!err(`experience.${i}.bullets`)}
                  className={err(`experience.${i}.bullets`) ? ERROR_RING : undefined}
                  rows={4}
                  value={e.bullets.join("\n")}
                  onChange={(ev) =>
                    setProfile((prev) => {
                      const next = { ...prev, experience: [...prev.experience] };
                      next.experience[i] = {
                        ...next.experience[i],
                        bullets: ev.target.value.split("\n"),
                      };
                      return next;
                    })
                  }
                  placeholder="Led a team of 5 engineers to ship..."
                />
                {err(`experience.${i}.bullets`) && (
                  <ErrorText>{err(`experience.${i}.bullets`)}</ErrorText>
                )}
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setProfile((prev) => ({
                ...prev,
                experience: [
                  ...prev.experience,
                  { title: "", company: "", dateRange: "", bullets: [""] },
                ],
              }))
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add entry
          </Button>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="education">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> Education
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pt-2">
          {p.education.map((ed, i) => (
            <div key={i} className="space-y-2 rounded-md border border-border p-3">
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete education entry"
                  onClick={() =>
                    setProfile((prev) => ({
                      ...prev,
                      education: prev.education.filter((_, idx) => idx !== i),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field path={`education.${i}.degree`} error={err(`education.${i}.degree`)} label="Degree" value={ed.degree} onChange={(v) => updateEd(setProfile, i, "degree", v)} />
                <Field path={`education.${i}.major`} error={err(`education.${i}.major`)} label="Major" value={ed.major} onChange={(v) => updateEd(setProfile, i, "major", v)} />
                <div className="col-span-2">
                  <Field path={`education.${i}.institution`} error={err(`education.${i}.institution`)} label="Institution" value={ed.institution} onChange={(v) => updateEd(setProfile, i, "institution", v)} />
                </div>
                <Field path={`education.${i}.year`} error={err(`education.${i}.year`)} label="Graduation Year" value={ed.year} onChange={(v) => updateEd(setProfile, i, "year", v)} />
                <Field path={`education.${i}.score`} error={err(`education.${i}.score`)} label="Score / CGPA" value={ed.score} onChange={(v) => updateEd(setProfile, i, "score", v)} />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setProfile((prev) => ({
                ...prev,
                education: [
                  ...prev.education,
                  { degree: "", major: "", institution: "", year: "", score: "" },
                ],
              }))
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add entry
          </Button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function updateEd(
  setProfile: Dispatch<SetStateAction<Profile>>,
  i: number,
  key: keyof Profile["education"][number],
  value: string,
) {
  setProfile((prev) => {
    const next = { ...prev, education: [...prev.education] };
    next.education[i] = { ...next.education[i], [key]: value };
    return next;
  });
}

function Field({
  label,
  value,
  onChange,
  path,
  error,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  path?: string;
  error?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <Label htmlFor={path ? `field-${path}` : undefined} className={`mb-1 block text-xs ${error ? "text-destructive" : ""}`}>{label}</Label>
      <Input
        id={path ? `field-${path}` : undefined}
        type={type}
        autoComplete={autoComplete}
        className={error ? `min-h-11 sm:min-h-0 ${ERROR_RING}` : "min-h-11 sm:min-h-0"}
        aria-invalid={!!error}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

const ERROR_RING =
  "border-destructive ring-2 ring-destructive/30 focus-visible:ring-destructive/40";

function ErrorText({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs font-medium text-destructive">{children}</p>;
}