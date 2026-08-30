import type { OptimizedResume } from "@/lib/resume.functions";
import {
  ATS_CLASSIC,
  SECTION_LABELS,
  type SectionKey,
  type TemplateConfig,
} from "@/lib/resume-templates";

type Props = {
  data: OptimizedResume;
  config?: TemplateConfig;
  /** Renders a scaled-down, non-printable thumbnail (used by the gallery). */
  scale?: number;
};

/**
 * Template-driven A4 resume renderer. Everything is real HTML text — no
 * images, tables, skill bars or graphics — so the export stays ATS-readable.
 */
export function ResumePreview({ data, config = ATS_CLASSIC, scale }: Props) {
  const c = config;
  const p = data.optimizedProfile.personal;
  const contacts = [p.phone, p.email, p.linkedin, p.github, p.portfolio].filter(Boolean);

  const page: React.CSSProperties = {
    fontFamily: c.fontFamily,
    fontSize: `${c.bodyFontSize}pt`,
    lineHeight: c.lineHeight,
    color: c.textColor,
    width: "210mm",
    minHeight: "297mm",
    paddingTop: `${c.marginTop}mm`,
    paddingBottom: `${c.marginBottom}mm`,
    paddingLeft: `${c.marginLeft}mm`,
    paddingRight: `${c.marginRight}mm`,
    background: "#ffffff",
    boxSizing: "border-box",
  };

  const heading = (title: string) => (
    <h2
      style={{
        fontSize: `${c.headingFontSize}pt`,
        fontWeight: c.headingWeight,
        color: c.headingColor,
        textTransform: c.uppercaseHeadings ? "uppercase" : "none",
        letterSpacing: c.uppercaseHeadings ? "0.06em" : "normal",
        borderBottom: c.showDividers ? `1px solid ${c.dividerColor}` : "none",
        paddingBottom: c.showDividers ? 2 : 0,
        marginBottom: 5,
      }}
    >
      {title}
    </h2>
  );

  const sectionWrap = (key: string, title: string, body: React.ReactNode) => (
    <section key={key} style={{ marginTop: c.sectionSpacing, breakInside: "avoid" }}>
      {heading(title)}
      {body}
    </section>
  );

  const renderSection = (key: SectionKey): React.ReactNode => {
    if (!c.sections[key]) return null;
    const prof = data.optimizedProfile;
    if (key === "summary") {
      if (!p.summary) return null;
      return sectionWrap(key, SECTION_LABELS.summary, <p style={{ margin: 0 }}>{p.summary}</p>);
    }
    if (key === "skills") {
      if (!prof.skills.length) return null;
      return sectionWrap(
        key,
        SECTION_LABELS.skills,
        <div>
          {prof.skills.map((s, i) => (
            <div key={i} style={{ marginBottom: c.bulletSpacing }}>
              <span style={{ fontWeight: 700 }}>{s.category}: </span>
              <span>{s.items.join(", ")}</span>
            </div>
          ))}
        </div>,
      );
    }
    if (key === "experience") {
      if (!prof.experience.length) return null;
      return sectionWrap(
        key,
        SECTION_LABELS.experience,
        <div>
          {prof.experience.map((e, i) => (
            <div
              key={i}
              data-resume-item
              style={{ marginBottom: i === prof.experience.length - 1 ? 0 : c.itemSpacing, breakInside: "avoid" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontWeight: 700, textTransform: "uppercase", color: c.headingColor }}>
                  {e.company}
                </span>
                <span style={{ whiteSpace: "nowrap", color: c.accentColor }}>{e.dateRange}</span>
              </div>
              <div style={{ fontStyle: "italic", color: c.accentColor }}>{e.title}</div>
              {e.bullets.length > 0 && (
                <ul style={{ margin: "3px 0 0", paddingLeft: "4.5mm", listStyleType: "disc" }}>
                  {e.bullets.map((b, j) => (
                    <li key={j} style={{ marginBottom: c.bulletSpacing }}>
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>,
      );
    }
    if (!prof.education.length) return null;
    return sectionWrap(
      key,
      SECTION_LABELS.education,
      <div>
        {prof.education.map((ed, i) => (
          <div
            key={i}
            data-resume-item
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: i === prof.education.length - 1 ? 0 : c.bulletSpacing,
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>{ed.institution}</div>
              <div style={{ color: c.accentColor }}>
                {ed.degree}
                {ed.major ? `, ${ed.major}` : ""}
              </div>
            </div>
            <div style={{ whiteSpace: "nowrap", color: c.accentColor }}>
              {ed.year}
              {ed.score ? ` · ${ed.score}` : ""}
            </div>
          </div>
        ))}
      </div>,
    );
  };

  /**
   * Print rules are emitted per-template so the exported PDF uses real A4 page
   * margins (applied to every page, not just the first) and identical
   * typography on any device/browser.
   */
  const printCss = `
@media print {
  @page {
    size: A4 portrait;
    margin: ${c.marginTop}mm ${c.marginRight}mm ${c.marginBottom}mm ${c.marginLeft}mm;
  }
  #resume-print-area {
    width: auto !important;
    min-height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    font-family: ${c.fontFamily};
    font-size: ${c.bodyFontSize}pt !important;
    line-height: ${c.lineHeight} !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  #resume-print-area * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  #resume-print-area p,
  #resume-print-area li,
  #resume-print-area div {
    orphans: 2;
    widows: 2;
  }
  #resume-print-area h1,
  #resume-print-area h2 {
    break-after: avoid-page;
    page-break-after: avoid;
    break-inside: avoid;
  }
  #resume-print-area section,
  #resume-print-area li,
  #resume-print-area [data-resume-item] {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  #resume-print-area section {
    margin-top: ${c.sectionSpacing}px;
  }
  #resume-print-area footer {
    break-inside: avoid;
  }
}`;

  const doc = (
    <article
      id={scale ? undefined : "resume-print-area"}
      style={page}
      className={scale ? "" : "mx-auto shadow-sm print:shadow-none"}
    >
      {!scale && <style dangerouslySetInnerHTML={{ __html: printCss }} />}

      <header style={{ textAlign: c.headerAlignment }}>
        <h1
          style={{
            fontSize: `${c.nameFontSize}pt`,
            fontWeight: 700,
            color: c.headingColor,
            letterSpacing: "0.02em",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          {p.fullName || "Your Name"}
        </h1>
        {p.title && (
          <p style={{ margin: "2px 0 0", color: c.accentColor, fontWeight: 600 }}>{p.title}</p>
        )}
        {contacts.length > 0 && (
          <p
            style={{
              margin: "4px 0 0",
              color: c.accentColor,
              fontSize: `${Math.max(8, c.bodyFontSize - 0.5)}pt`,
              display: c.contactLayout === "stacked" ? "block" : undefined,
            }}
          >
            {c.contactLayout === "stacked"
              ? contacts.map((v, i) => <span key={i} style={{ display: "block" }}>{v}</span>)
              : contacts.join("  |  ")}
          </p>
        )}
        {c.showDividers && (
          <hr style={{ border: 0, borderTop: `1px solid ${c.dividerColor}`, marginTop: 8 }} />
        )}
      </header>

      {c.sectionOrder.map((key) => renderSection(key))}

      {c.showFooter && c.footerText && (
        <footer
          style={{
            marginTop: c.sectionSpacing,
            paddingTop: 4,
            borderTop: `1px solid ${c.dividerColor}`,
            fontSize: `${Math.max(7.5, c.bodyFontSize - 1.5)}pt`,
            color: c.accentColor,
            textAlign: "center",
          }}
        >
          {c.footerText}
        </footer>
      )}
    </article>
  );

  if (!scale) return doc;
  return (
    <div
      aria-hidden
      style={{
        width: `calc(210mm * ${scale})`,
        height: `calc(297mm * ${scale})`,
        overflow: "hidden",
      }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>{doc}</div>
    </div>
  );
}
