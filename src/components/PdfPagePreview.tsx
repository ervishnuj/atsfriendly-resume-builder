import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ResumePreview } from "@/components/ResumePreview";
import type { OptimizedResume } from "@/lib/resume.functions";
import type { TemplateConfig } from "@/lib/resume-templates";
import { resumePrintConfig } from "@/lib/resume-print-layout";

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
export function PdfPagePreview({ data, config: sourceConfig, showGuides = true }: Props) {
  const config = resumePrintConfig(sourceConfig);
  const measureRef = useRef<HTMLDivElement>(null);
  const [offsets, setOffsets] = useState<number[]>([0]);
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / A4_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const contentHeight = Math.max(
    120,
    A4_H - (config.marginTop + config.marginBottom) * PX_PER_MM,
  );

  const paginate = () => {
    const root = measureRef.current?.querySelector("article");
    if (!root) return;
    const contentTop = root.getBoundingClientRect().top + config.marginTop * PX_PER_MM;

    // Match print fragmentation: sections/entries may continue, while headings,
    // entry headers, skill rows and individual bullets are atomic.
    const blocks = Array.from(root.querySelectorAll<HTMLElement>(
      "[data-resume-block], section > h2, section > p, footer",
    ));

    const breaks = [0];
    let pageStart = 0;
    blocks.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      const top = rect.top - contentTop;
      let bottom = rect.bottom - contentTop;
      let nextIndex = index;
      while (blocks[nextIndex]?.hasAttribute("data-resume-keep-next") && blocks[nextIndex + 1]) {
        nextIndex += 1;
        bottom = blocks[nextIndex].getBoundingClientRect().bottom - contentTop;
      }
      while (top - pageStart >= contentHeight) {
        pageStart += contentHeight;
        breaks.push(pageStart);
      }
      if (bottom - pageStart > contentHeight && top > pageStart) {
        pageStart = top;
        breaks.push(pageStart);
      }
    });

    // Real content height: bottom of the last rendered block (the article uses
    // min-height: 297mm + bottom padding, so its own box is never a valid measure).
    const totalHeight = blocks.length
      ? Math.max(
          ...blocks.map((el) => el.getBoundingClientRect().bottom - contentTop),
        )
      : 0;
    while (totalHeight - breaks[breaks.length - 1] > contentHeight + 1) {
      breaks.push(breaks[breaks.length - 1] + contentHeight);
    }


    setOffsets((prev) =>
      prev.length === breaks.length && prev.every((v, i) => Math.abs(v - breaks[i]) < 1)
        ? prev
        : breaks,
    );
  };

  useLayoutEffect(paginate, [data, sourceConfig]);

  useEffect(() => {
    const id = window.setTimeout(paginate, 250); // re-measure after webfonts settle
    window.addEventListener("resize", paginate);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", paginate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sourceConfig]);

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
        <ResumePreview data={data} config={config} printable={false} pdfLayout />
      </div>

      <div ref={frameRef} className="flex flex-col items-center gap-6">
        {offsets.map((offset, i) => (
          <div key={i} className="w-full">
            <div className="mb-1 text-center text-xs text-muted-foreground">
              Page {i + 1} of {offsets.length} · A4 210 × 297 mm
            </div>
            <div className="mx-auto" style={{ width: `${A4_W * scale}px`, height: `${A4_H * scale}px` }}>
            <div
              className="relative overflow-hidden bg-white shadow-md ring-1 ring-border"
              style={{ width: `${A4_W}px`, height: `${A4_H}px`, transform: `scale(${scale})`, transformOrigin: "top left" }}
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
                  height: `${Math.min(contentHeight, (offsets[i + 1] ?? offset + contentHeight) - offset)}px`,
                  overflow: "hidden",
                }}
              >
                <div style={{ transform: `translateY(${-offset - config.marginTop * PX_PER_MM}px)` }}>
                  <ResumePreview
                    data={data}
                    config={config}
                    printable={false}
                      pdfLayout
                  />
                </div>
              </div>
            </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
