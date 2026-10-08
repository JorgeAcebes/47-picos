"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Registro para observabilidad/consola
    console.error("App boundary captured error:", error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        textAlign: "center",
        background: "var(--paper, #faf8f1)",
        color: "var(--ink, #18342d)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "440px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(163, 79, 61, 0.1)",
            borderRadius: "50%",
            color: "var(--danger, #a34f3d)",
          }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "1.85rem",
            fontWeight: 700,
            lineHeight: 1.25,
            margin: 0,
            color: "var(--ink, #18342d)",
          }}
        >
          Ha ocurrido un contratiempo
        </h1>

        <p
          style={{
            fontSize: "0.95rem",
            lineHeight: 1.5,
            color: "var(--muted, #62716b)",
            margin: 0,
          }}
        >
          No hemos podido cargar esta sección correctamente. Puedes intentar
          recargar la vista o regresar a la pantalla principal.
        </p>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            marginTop: "0.5rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => reset()}
            className="button button--green"
            style={{
              padding: "0.65rem 1.4rem",
              fontSize: "0.92rem",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="button button--outline"
            style={{
              textDecoration: "none",
              padding: "0.65rem 1.4rem",
              fontSize: "0.92rem",
            }}
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
