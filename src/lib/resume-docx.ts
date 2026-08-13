import type { OptimizedResume } from "@/lib/resume.functions";

/**
 * Builds a Word (.docx) version of the generated resume in the browser and
 * triggers a download. Uses the same data that the on-screen preview renders,
 * so the exported file always belongs to the signed-in user's resume.
 */
export async function downloadResumeDocx(resume: OptimizedResume) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
  } = await import("docx");

  const p = resume.optimizedProfile.personal;
  const contact = [p.email, p.phone, p.linkedin, p.github, p.portfolio]
    .map((v) => (v ?? "").trim())
    .filter(Boolean)
    .join("  |  ");

  const heading = (text: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 80 },
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 24 })],
    });

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: p.fullName || "Resume", bold: true, size: 36 })],
    }),
  ];

  if (p.title?.trim()) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: p.title, size: 24 })],
      }),
    );
  }
  if (contact) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: contact, size: 18 })],
      }),
    );
  }

  if (p.summary?.trim()) {
    children.push(heading("Professional Summary"));
    children.push(new Paragraph({ children: [new TextRun({ text: p.summary, size: 20 })] }));
  }

  const skills = (resume.optimizedProfile.skills ?? []).filter(
    (g) => (g.items ?? []).length > 0,
  );
  if (skills.length > 0) {
    children.push(heading("Skills"));
    for (const group of skills) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${group.category}: `, bold: true, size: 20 }),
            new TextRun({ text: group.items.join(", "), size: 20 }),
          ],
        }),
      );
    }
  }

  const experience = (resume.optimizedProfile.experience ?? []).filter(
    (e) => e.title || e.company,
  );
  if (experience.length > 0) {
    children.push(heading("Professional Experience"));
    for (const job of experience) {
      children.push(
        new Paragraph({
          spacing: { before: 120 },
          children: [
            new TextRun({ text: [job.title, job.company].filter(Boolean).join(" — "), bold: true, size: 20 }),
            ...(job.dateRange ? [new TextRun({ text: `   ${job.dateRange}`, size: 18, italics: true })] : []),
          ],
        }),
      );
      for (const bullet of job.bullets ?? []) {
        if (!bullet?.trim()) continue;
        children.push(
          new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: bullet, size: 20 })] }),
        );
      }
    }
  }

  const education = (resume.optimizedProfile.education ?? []).filter(
    (e) => e.degree || e.institution,
  );
  if (education.length > 0) {
    children.push(heading("Education"));
    for (const ed of education) {
      const line = [ed.degree, ed.major].filter(Boolean).join(", ");
      const detail = [ed.institution, ed.year, ed.score].filter(Boolean).join(" · ");
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: line || ed.institution, bold: true, size: 20 }),
            ...(detail ? [new TextRun({ text: `\n${detail}`, size: 18 })] : []),
          ],
        }),
      );
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  const safeName = (p.fullName || "resume").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName || "resume"}-resume.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
