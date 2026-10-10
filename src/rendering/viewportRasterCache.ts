/** A bounded, full-density motion buffer. The SVG remains the artwork and hit target. */
type WindowRect = { x: number; y: number; width: number; height: number };
type Entry = WindowRect & { scale: number };
const PIXEL_BUDGET = 8_000_000;
const HALO = 112; // More than every blur, offset and morphology kernel combined.
export function installViewportRasterCache({ viewport, svg, canvas, scale, rotated, originalHeight, snapshot }: {
  viewport: HTMLElement; svg: SVGSVGElement; canvas: HTMLCanvasElement;
  scale: () => number; rotated: boolean; originalHeight: number;
  snapshot: (svg: SVGSVGElement) => Promise<SVGSVGElement>;
}): () => void {
  let entry: Entry | undefined, stopped = false, capturing = false, timer = 0;
  const visible = (): WindowRect => {
    const v = viewport.getBoundingClientRect(), s = svg.getBoundingClientRect(), z = scale();
    const x = Math.max(0, (v.left - s.left) / z), y = Math.max(0, (v.top - s.top) / z);
    return { x, y, width: Math.max(0, Math.min(svg.viewBox.baseVal.width, (v.left + viewport.clientWidth - s.left) / z) - x), height: Math.max(0, Math.min(svg.viewBox.baseVal.height, (v.top + viewport.clientHeight - s.top) / z) - y) };
  };
  const covers = (e: Entry, r: WindowRect) => r.x >= e.x - .1 && r.y >= e.y - .1 && r.x + r.width <= e.x + e.width + .1 && r.y + r.height <= e.y + e.height + .1;
  const sync = () => {
    if (stopped) return;
    const r = visible(), active = Boolean(entry && covers(entry, r) && viewport.classList.contains('is-navigating'));
    if (active && entry) {
      const z = scale();
      canvas.style.width = `${entry.width}px`; canvas.style.height = `${entry.height}px`;
      canvas.style.transform = `translate3d(${entry.x * z}px,${entry.y * z}px,0) scale(${z})`;
    }
    if (viewport.classList.contains('has-motion-buffer') !== active) viewport.classList.toggle('has-motion-buffer', active);
  };
  const prepare = async () => {
    timer = 0;
    if (stopped || capturing || viewport.classList.contains('is-navigating')) { schedule(); return; }
    const r = visible(), z = scale(), density = z * window.devicePixelRatio;
    if (!r.width || !r.height || r.width * r.height * density * density > PIXEL_BUDGET) return;
    if (entry && covers(entry, r) && Math.abs(entry.scale / z - 1) < .01) return;
    const margin = Math.min(2, Math.sqrt(PIXEL_BUDGET / (r.width * r.height * density * density)));
    const w = Math.min(svg.viewBox.baseVal.width, r.width * margin), h = Math.min(svg.viewBox.baseVal.height, r.height * margin);
    const region = { x: Math.max(0, Math.min(svg.viewBox.baseVal.width - w, r.x - (w - r.width) / 2)), y: Math.max(0, Math.min(svg.viewBox.baseVal.height - h, r.y - (h - r.height) / 2)), width: w, height: h };
    capturing = true; canvas.dataset.cache = 'preparing'; let url: string | undefined;
    try {
      const clone = await snapshot(svg);
      if (stopped) return;
      // Reuse actual screen styles as well as the export's embedded image assets.
      const styles = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styles.textContent = Array.from(document.styleSheets).flatMap(sheet => { try { return Array.from(sheet.cssRules, rule => rule.cssText); } catch { return []; } }).join('\n');
      clone.append(styles); clone.style.opacity = '1';
      const pw = Math.ceil(w * density), ph = Math.ceil(h * density);
      clone.setAttribute('viewBox', `${region.x} ${region.y} ${w} ${h}`); clone.setAttribute('width', String(pw)); clone.setAttribute('height', String(ph));
      // Bound expensive intermediate surfaces, with ample offscreen context for edges.
      const f = rotated ? { x: region.y, y: originalHeight - region.x - w, width: h, height: w } : region;
      for (const node of clone.querySelectorAll('filter[filterUnits="userSpaceOnUse"],mask[maskUnits="userSpaceOnUse"]')) {
        node.setAttribute('x', String(f.x - HALO)); node.setAttribute('y', String(f.y - HALO));
        node.setAttribute('width', String(f.width + HALO * 2)); node.setAttribute('height', String(f.height + HALO * 2));
      }
      url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }));
      const image = new Image(); image.src = url; await image.decode(); if (stopped) return;
      const pixels = document.createElement('canvas'); pixels.width = pw; pixels.height = ph;
      const context = pixels.getContext('2d'); if (!context) return;
      context.drawImage(image, 0, 0); if (stopped) return;
      canvas.width = pw; canvas.height = ph; const target = canvas.getContext('2d'); if (!target) return;
      target.drawImage(pixels, 0, 0); entry = { ...region, scale: z }; canvas.dataset.cache = 'ready'; sync();
    } catch {
      // An unavailable asset or canvas simply leaves the original SVG in use.
      canvas.dataset.cache = 'unavailable';
    } finally { if (url) URL.revokeObjectURL(url); capturing = false; if (!stopped) schedule(); }
  };
  const schedule = () => { if (stopped) return; clearTimeout(timer); timer = window.setTimeout(prepare, 250); };
  const onScroll = () => { sync(); schedule(); };
  const observer = new MutationObserver(() => { sync(); schedule(); });
  observer.observe(svg, { attributes: true, attributeFilter: ['style'] });
  observer.observe(viewport, { attributes: true, attributeFilter: ['class'] });
  const resize = new ResizeObserver(onScroll); resize.observe(viewport);
  viewport.addEventListener('scroll', onScroll, { passive: true }); schedule();
  return () => {
    stopped = true; clearTimeout(timer); observer.disconnect(); resize.disconnect(); viewport.removeEventListener('scroll', onScroll);
    viewport.classList.remove('has-motion-buffer'); canvas.dataset.cache = 'off'; canvas.width = canvas.height = 0; entry = undefined;
  };
}
