"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/observability/error-reporter";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    reportError(error, { digest: error.digest, source: "global-error-boundary" });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0b1120",
          color: "#e2e8f0",
        }}
      >
        <div
          role="alert"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
            textAlign: "center",
            maxWidth: "28rem",
            padding: "2rem",
          }}
        >
          <p style={{ fontSize: "2rem", margin: 0 }} aria-hidden="true">
            ⚠
          </p>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#94a3b8", margin: 0 }}>
            A critical error occurred. Refreshing the page may resolve it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1.25rem",
              borderRadius: "0.5rem",
              border: "1px solid #334155",
              background: "#1e293b",
              color: "#e2e8f0",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
