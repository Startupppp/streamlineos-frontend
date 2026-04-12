import { substituteVariables } from "@/lib/utils/document-variables";

/**
 * Generates a document by substituting variables in an HTML template and
 * returning the result as a Buffer.
 *
 * jsPDF is a browser library; puppeteer/chromium is not installed.
 * The MVP approach is to return the fully-substituted HTML wrapped in a
 * minimal print-ready page so it can be downloaded and printed/viewed directly.
 * The content-type should be "text/html" and the filename should end in ".html".
 */
export async function generateDocumentPdf(
  htmlContent: string,
  variables: Record<string, string>
): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
  const { result } = substituteVariables(htmlContent, variables);

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #111;
      background: #fff;
      padding: 48px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1, h2, h3 { margin-bottom: 12px; }
    p { margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    td, th { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
${result}
</body>
</html>`;

  return {
    buffer: Buffer.from(fullHtml, "utf-8"),
    mimeType: "text/html",
    extension: "html",
  };
}
