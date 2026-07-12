"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Loader2 } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

interface PdfCanvasProps {
  fileUrl: string;
  pageNumber: number;
  onPageInfo?: (info: { pageCount: number; widthPt: number; heightPt: number }) => void;
  onCanvasClick?: (xPt: number, yPt: number) => void;
  renderOverlay?: (scale: number) => ReactNode;
}

export function PdfCanvas({ fileUrl, pageNumber, onPageInfo, onCanvasClick, renderOverlay }: PdfCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const renderPage = useCallback(
    async (doc: pdfjsLib.PDFDocumentProxy, num: number) => {
      const page = await doc.getPage(num);
      const containerWidth = containerRef.current?.clientWidth ?? 800;
      const naturalViewport = page.getViewport({ scale: 1 });
      const fitScale = containerWidth / naturalViewport.width;
      const viewport = page.getViewport({ scale: fitScale });

      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvas, canvasContext: context, viewport }).promise;

      setScale(fitScale);
      onPageInfo?.({ pageCount: doc.numPages, widthPt: naturalViewport.width, heightPt: naturalViewport.height });
    },
    [onPageInfo],
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const doc = await pdfjsLib.getDocument({ url: fileUrl }).promise;
        if (cancelled) return;
        docRef.current = doc;
        await renderPage(doc, pageNumber);
      } catch {
        if (!cancelled) setError("Unable to load this document.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally only reload the document when its URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  useEffect(() => {
    if (!docRef.current) return;
    let cancelled = false;
    void renderPage(docRef.current, pageNumber).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [pageNumber, renderPage]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onCanvasClick || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;
    onCanvasClick(xPx / scale, yPx / scale);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {isLoading && (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && <p className="text-sm text-destructive py-12 text-center">{error}</p>}
      <div className="relative inline-block" onClick={handleClick}>
        <canvas ref={canvasRef} className="rounded-lg shadow-sm border border-border" />
        {!isLoading && !error && renderOverlay?.(scale)}
      </div>
    </div>
  );
}
