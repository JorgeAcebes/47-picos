import Link from "next/link";

export default function NotFound() {
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
          maxWidth: "460px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
        }}
      >
        {/* Isotipo de montaña Atlas */}
        <div
          style={{
            width: "80px",
            height: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(36, 95, 82, 0.08)",
            borderRadius: "50%",
            marginBottom: "0.5rem",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 52 L36 12 L48 32 Z" fill="#245f52" />
            <path d="M24 60 L44 26 L60 52 Z" fill="#5b3a8c" opacity="0.8" />
          </svg>
        </div>

        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "0.9rem",
            letterSpacing: "2px",
            color: "var(--sage, #5c9b7d)",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Error 404
        </span>

        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "2.25rem",
            fontWeight: 700,
            lineHeight: 1.2,
            margin: 0,
            color: "var(--ink, #18342d)",
          }}
        >
          Te has salido del mapa
        </h1>

        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.5,
            color: "var(--muted, #62716b)",
            margin: 0,
          }}
        >
          No hemos podido encontrar las coordenadas de esta cumbre o destino. Es
          posible que el enlace haya cambiado o ya no esté disponible.
        </p>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            marginTop: "1rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Link
            href="/"
            className="button button--green"
            style={{
              textDecoration: "none",
              padding: "0.65rem 1.4rem",
              fontSize: "0.95rem",
            }}
          >
            Volver al mapa
          </Link>
          <Link
            href="/social"
            className="button button--outline"
            style={{
              textDecoration: "none",
              padding: "0.65rem 1.4rem",
              fontSize: "0.95rem",
            }}
          >
            Comunidad
          </Link>
        </div>
      </div>
    </main>
  );
}
