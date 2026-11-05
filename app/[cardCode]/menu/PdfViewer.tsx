'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

export default function PdfViewer({ source, title, language }: { source: string; title: string; language: 'id' | 'en' }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(320);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [rendering, setRendering] = useState(false);
  const tr = (id: string, en: string) => language === 'en' ? en : id;

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.floor(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<typeof import('pdfjs-dist')['getDocument']> | undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    setLoading(true); setError(false); setDocument(null); setPage(1);
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        const response = await fetch(source, { signal: controller.signal });
        if (!response.ok) throw new Error('PDF_UNAVAILABLE');
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > 10 * 1024 * 1024 || new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') throw new Error('INVALID_PDF');
        if (cancelled) return;
        task = pdfjs.getDocument({ data: bytes, enableXfa: false });
        const pdf = await task.promise;
        if (!cancelled) setDocument(pdf);
      } catch { if (!cancelled) setError(true); }
      finally { clearTimeout(timer); if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); void task?.destroy(); };
  }, [source, retry]);

  useEffect(() => {
    if (!document || !canvas.current) return;
    let cancelled = false;
    let render: RenderTask | undefined;
    setRendering(true);
    (async () => {
      try {
        const pdfPage = await document.getPage(page);
        if (cancelled || !canvas.current) return;
        const element = canvas.current;
        const natural = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({ scale: (width / natural.width) * zoom });
        // Bound backing canvas memory for mobile devices and very large PDF pages.
        const density = Math.min(window.devicePixelRatio || 1, 2, 4096 / Math.max(viewport.width, viewport.height));
        element.width = Math.floor(viewport.width * density);
        element.height = Math.floor(viewport.height * density);
        element.style.width = `${viewport.width}px`;
        element.style.height = `${viewport.height}px`;
        render = pdfPage.render({ canvas: element, viewport, transform: [density, 0, 0, density, 0, 0] });
        await render.promise;
      } catch { if (!cancelled) setError(true); }
      finally { if (!cancelled) setRendering(false); }
    })();
    return () => { cancelled = true; render?.cancel(); };
  }, [document, page, width, zoom]);

  return <div style={{ padding: 12, background: '#f7f3ef' }}>
    {document && !error && <div aria-label={tr('Navigasi dokumen', 'Document navigation')} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
      <button disabled={page <= 1 || rendering} onClick={() => setPage(p => p - 1)}>{tr('Sebelumnya', 'Previous')}</button>
      <span aria-live="polite">{tr('Halaman', 'Page')} {page} / {document.numPages}</span>
      <button disabled={page >= document.numPages || rendering} onClick={() => setPage(p => p + 1)}>{tr('Berikutnya', 'Next')}</button>
      <button aria-label={tr('Perkecil', 'Zoom out')} disabled={zoom <= 1} onClick={() => setZoom(z => Math.max(1, z - 0.25))}>−</button>
      <button aria-label={tr('Perbesar', 'Zoom in')} disabled={zoom >= 2} onClick={() => setZoom(z => Math.min(2, z + 0.25))}>+</button>
    </div>}
    {loading && <p role="status">{tr('Memuat dokumen…', 'Loading document…')}</p>}
    {error && <div role="alert"><p>{tr('Dokumen belum dapat ditampilkan. Coba lagi atau unduh PDF untuk membukanya.', 'The document could not be displayed. Retry or download the PDF to open it.')}</p><button onClick={() => setRetry(n => n + 1)}>{tr('Coba Lagi', 'Retry')}</button></div>}
    <div ref={container} style={{ width: '100%', overflow: 'auto', minHeight: loading ? 240 : undefined }}>
      <canvas ref={canvas} aria-label={title} role="img" style={{ display: document && !error ? 'block' : 'none', background: '#fff', margin: '0 auto' }} />
    </div>
    <style>{`button { font: inherit; } [aria-label="${language === 'en' ? 'Document navigation' : 'Navigasi dokumen'}"] button { border: 1px solid #d9c3ad; background: #fffaf4; color: #4b3428; border-radius: 10px; padding: 10px 12px; min-height: 44px; cursor: pointer; } button:disabled { opacity: .5; cursor: default; }`}</style>
  </div>;
}
