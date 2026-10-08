export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--paper, #faf8f1)",
        color: "var(--muted, #62716b)",
        fontFamily: "'DM Sans', sans-serif",
        gap: "1.25rem",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          backgroundColor: "rgba(36, 95, 82, 0.08)",
          animation: "atlasPulse 1.6s ease-in-out infinite",
        }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 52 L36 12 L48 32 Z" fill="#245f52" />
          <path d="M24 60 L44 26 L60 52 Z" fill="#5b3a8c" opacity="0.85" />
        </svg>
      </div>

      <span
        style={{
          fontSize: "0.85rem",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          fontFamily: "'DM Mono', monospace",
          color: "var(--sage, #5c9b7d)",
          fontWeight: 600,
        }}
      >
        Cargando…
      </span>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes atlasPulse {
              0%, 100% {
                transform: scale(0.96);
                opacity: 0.7;
              }
              50% {
                transform: scale(1.08);
                opacity: 1;
              }
            }
          `,
        }}
      />
    </div>
  );
}
