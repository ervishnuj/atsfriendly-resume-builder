import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ResumePreview } from "@/components/ResumePreview";
import type { OptimizedResume } from "@/lib/resume.functions";
import type { TemplateConfig } from "@/lib/resume-templates";

const PX_PER_MM = 96 / 25.4;
const A4_H = 297 * PX_PER_MM;
const A4_W = 210 * PX_PER_MM;

type Props = {
  data: OptimizedResume;
  config: TemplateConfig;
  /** Show the dashed margin guides on each page. */
  showGuides?: boolean;
};

/**
 * Renders the resume exactly as it will be exported: real A4 sheets, the
 * template's page margins, and page breaks computed with the same
 * "don't split a block" rules the print stylesheet uses.
 */
export function PdfPagePreview({ data, config, showGuides = true }: Props) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [offsets, setOffsets] = useState<number[]>([0]);

  const contentHeight = Math.max(
    120,
    A4_H - (config.marginTop + config.marginBottom) * PX_PER_MM,
  );

  const paginate = () => {
    const root = measureRef.current?.querySelector("article");
    if (!root) return;
    const contentTop = root.getBoundingClientRect().top + config.marginTop * PX_PER_MM;

    // Atomic blocks: a section stays whole when it fits, otherwise it is split
    // at its own children (heading, entries, bullets).
    const blocks: HTMLElement[] = [];
    Array.from(root.children).forEach((child) => {
      const el = child as HTMLElement;
      if (el.tagName === "STYLE") return;
      const h = el.getBoundingClientRect().height;
      if (el.tagName === "SECTION" && h > contentHeight) {
        Array.from(el.children).forEach((sub) => {
          const subEl = sub as HTMLElement;
          if (subEl.children.length && subEl.getBoundingClientRect().height > contentHeight) {
            Array.from(subEl.children).forEach((leaf) => blocks.push(leaf as HTMLElement));
          } else {
            blocks.push(subEl);
          }
        });
      } else {
        blocks.push(el);
      }
    });

    const breaks = [0];
    let pageStart = 0;
    blocks.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const top = rect.top - contentTop;
      const bottom = rect.bottom - contentTop;
      if (bottom - pageStart > contentHeight && top > pageStart) {
        pageStart = top;
        breaks.push(pageStart);
      }
    });

    const totalHeight = root.getBoundingClientRect().height - config.marginTop * PX_PER_MM;
    while (totalHeight - breaks[breaks.length - 1] > contentHeight + 1) {
      breaks.push(breaks[breaks.length - 1] + contentHeight);
    }

    setOffsets((prev) =>
      prev.length === breaks.length && prev.every((v, i) => Math.abs(v - breaks[i]) < 1)
        ? prev
        : breaks,
    );
  };

  useLayoutEffect(paginate, [data, config]);

  useEffect(() => {
    const id = window.setTimeout(paginate, 250); // re-measure after webfonts settle
    window.addEventListener("resize", paginate);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", paginate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, config]);

  return (
    <div className="print:hidden">
      {/* Hidden measuring copy — same markup, full flow height. */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: "absolute",
          left: -99999,
          top: 0,
          width: `${A4_W}px`,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        <ResumePreview data={data} config={config} printable={false} />
      </div>

      <div className="flex flex-col items-center gap-6">
        {offsets.map((offset, i) => (
          <div key={i} className="w-full">
            <div className="mb-1 text-center text-xs text-muted-foreground">
              Page {i + 1} of {offsets.length} · A4 210 × 297 mm
            </div>
            <div
              className="relative mx-auto overflow-hidden bg-white shadow-md ring-1 ring-border"
              style={{ width: `${A4_W}px`, height: `${A4_H}px` }}
            >
              {showGuides && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute border border-dashed border-primary/30"
                  style={{
                    top: `${config.marginTop}mm`,
                    bottom: `${config.marginBottom}mm`,
                    left: `${config.marginLeft}mm`,
                    right: `${config.marginRight}mm`,
                  }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  top: `${config.marginTop * PX_PER_MM}px`,
                  left: 0,
                  right: 0,
                  height: `${contentHeight}px`,
                  overflow: "hidden",
                }}
              >
                <div style={{ transform: `translateY(${-offset}px)` }}>
                  <ResumePreview
                    data={data}
                    config={{ ...config, marginTop: 0, marginBottom: 0 }}
                    printable={false}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
