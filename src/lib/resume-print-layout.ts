import { DEFAULT_SECTION_ORDER, type TemplateConfig } from "./resume-templates";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** PDF-only readability bounds; saved templates and DOCX configuration stay unchanged. */
export function resumePrintConfig(config: TemplateConfig): TemplateConfig {
  return {
    ...config,
    bodyFontSize: clamp(config.bodyFontSize, 9, 10.5),
    nameFontSize: clamp(config.nameFontSize, 18, 22),
    headingFontSize: clamp(config.headingFontSize, 10, 12),
    lineHeight: clamp(config.lineHeight, 1.15, 1.3),
    marginTop: clamp(config.marginTop, 12, 18),
    marginBottom: clamp(config.marginBottom, 12, 18),
    marginLeft: clamp(config.marginLeft, 12, 20),
    marginRight: clamp(config.marginRight, 12, 20),
    sectionSpacing: clamp(config.sectionSpacing, 8, 12),
    itemSpacing: clamp(config.itemSpacing, 5, 9),
    bulletSpacing: clamp(config.bulletSpacing, 1, 3),
    sectionOrder: config.sectionOrder.join() === DEFAULT_SECTION_ORDER.join()
      ? ["summary", "skills", "experience", "education"]
      : config.sectionOrder,
  };
}