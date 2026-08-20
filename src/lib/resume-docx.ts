import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TabStopPosition,
  TabStopType,
  TextRun,
} from "docx";
import type { OptimizedResume } from "./resume.functions";
import { SECTION_LABELS, type TemplateConfig } from "./resume-templates";

const mm = (v: number) => Math.round(v * 56.7); // mm -> DXA twips
const hp = (pt: number) => Math.round(pt * 2); // pt -> half-points
const hex = (c: string) => c.replace("#", "").toUpperCase().slice(0, 6) || "000000";
const family = (f: string) => f.split(",")[0].replace(/["']/g, "").trim() || "Arial";

const align = (a: TemplateConfig["headerAlignment"]) =>
  a === "center" ? AlignmentType.CENTER : a === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT;

/**
 * Builds a real, text-selectable DOCX from the same structured resume data and
 * template configuration that drives the on-screen A4 preview.
 */
export async function buildResumeDocx(
  data: OptimizedResume,
  c: TemplateConfig,
): Promise<Blob> {
  const font = family(c.fontFamily);
  const p = data.optimizedProfile.personal;
  const prof = data.optimizedProfile;
  const contacts = [p.phone, p.email, p.linkedin, p.github, p.portfolio].filter(Boolean);
  const children: Paragraph[] = [];

  const sectionHeading = (title: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: c.sectionSpacing * 15, after: 60 },
      border: c.showDividers
        ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: hex(c.dividerColor), space: 1 } }
        : undefined,
      children: [
        new TextRun({
          text: c.uppercaseHeadings ? title.toUpperCase() : title,
          bold: c.headingWeight >= 600,
          size: hp(c.headingFontSize),
          color: hex(c.headingColor),
          font,
        }),
      ],
    });

  children.push(
    new Paragraph({
      alignment: align(c.headerAlignment),
      children: [
        new TextRun({
          text: (p.fullName || "Your Name").toUpperCase(),
          bold: true,
          size: hp(c.nameFontSize),
          color: hex(c.headingColor),
          font,
        }),
      ],
    }),
  );
  if (p.title)
    children.push(
      new Paragraph({
        alignment: align(c.headerAlignment),
        children: [new TextRun({ text: p.title, bold: true, size: hp(c.bodyFontSize), color: hex(c.accentColor), font })],
      }),
    );
  if (contacts.length)
    children.push(
      new Paragraph({
        alignment: align(c.headerAlignment),
        spacing: { after: 120 },
        children:
          c.contactLayout === "stacked"
            ? contacts.flatMap((v, i) => [
                new TextRun({ text: v, size: hp(c.bodyFontSize - 0.5), color: hex(c.accentColor), font, break: i ? 1 : 0 }),
              ])
            : [
                new TextRun({
                  text: contacts.join("  |  "),
                  size: hp(c.bodyFontSize - 0.5),
                  color: hex(c.accentColor),
                  font,
                }),
              ],
      }),
    );

  for (const key of c.sectionOrder) {
    if (!c.sections[key]) continue;
    if (key === "summary" && p.summary) {
      children.push(sectionHeading(SECTION_LABELS.summary));
      children.push(new Paragraph({ children: [new TextRun({ text: p.summary, size: hp(c.bodyFontSize), color: hex(c.textColor), font })] }));
    }
    if (key === "experience" && prof.experience.length) {
      children.push(sectionHeading(SECTION_LABELS.experience));
      for (const e of prof.experience) {
        children.push(
          new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            spacing: { before: c.itemSpacing * 12 },
            children: [
              new TextRun({ text: e.company.toUpperCase(), bold: true, size: hp(c.bodyFontSize), color: hex(c.headingColor), font }),
              new TextRun({ text: `\t${e.dateRange}`, size: hp(c.bodyFontSize), color: hex(c.accentColor), font }),
            ],
          }),
        );
        children.push(
          new Paragraph({
            children: [new TextRun({ text: e.title, italics: true, size: hp(c.bodyFontSize), color: hex(c.accentColor), font })],
          }),
        );
        for (const b of e.bullets)
          children.push(
            new Paragraph({
              numbering: { reference: "resume-bullets", level: 0 },
              children: [new TextRun({ text: b, size: hp(c.bodyFontSize), color: hex(c.textColor), font })],
            }),
          );
      }
    }
    if (key === "education" && prof.education.length) {
      children.push(sectionHeading(SECTION_LABELS.education));
      for (const ed of prof.education) {
        children.push(
          new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            children: [
              new TextRun({ text: ed.institution, bold: true, size: hp(c.bodyFontSize), color: hex(c.textColor), font }),
              new TextRun({
                text: `\t${ed.year}${ed.score ? ` · ${ed.score}` : ""}`,
                size: hp(c.bodyFontSize),
                color: hex(c.accentColor),
                font,
              }),
            ],
          }),
        );
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${ed.degree}${ed.major ? `, ${ed.major}` : ""}`,
                size: hp(c.bodyFontSize),
                color: hex(c.accentColor),
                font,
              }),
            ],
          }),
        );
      }
    }
    if (key === "skills" && prof.skills.length) {
      children.push(sectionHeading(SECTION_LABELS.skills));
      for (const s of prof.skills)
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${s.category}: `, bold: true, size: hp(c.bodyFontSize), color: hex(c.textColor), font }),
              new TextRun({ text: s.items.join(", "), size: hp(c.bodyFontSize), color: hex(c.textColor), font }),
            ],
          }),
        );
    }
  }

  if (c.showFooter && c.footerText)
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [new TextRun({ text: c.footerText, size: hp(c.bodyFontSize - 1.5), color: hex(c.accentColor), font })],
      }),
    );

  const doc = new Document({
    styles: { default: { document: { run: { font, size: hp(c.bodyFontSize), color: hex(c.textColor) } } } },
    numbering: {
      config: [
        {
          reference: "resume-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 340, hanging: 200 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: {
              top: mm(c.marginTop),
              bottom: mm(c.marginBottom),
              left: mm(c.marginLeft),
              right: mm(c.marginRight),
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
