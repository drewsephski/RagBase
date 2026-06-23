import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/lib/domain/site";

export const ogImageSize = {
  width: 1200,
  height: 630,
};

export const ogImageAlt = `${SITE_NAME} — ${SITE_TAGLINE}`;

export function OgImageContent() {
  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#0a0a0a",
        color: "#fafafa",
        padding: "72px",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          width="88"
          height="88"
        >
          <rect width="32" height="32" rx="8" fill="#141414" />
          <path
            d="M7.5 6.5h10.2l3.8 3.8V23.5a2 2 0 0 1-2 2H7.5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z"
            fill="#fafafa"
            fillOpacity="0.95"
          />
          <path
            d="M17.7 6.5v3.8h3.8"
            stroke="#141414"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M9.2 13.8h8.1M9.2 16.8h6.2M9.2 19.8h7.4"
            stroke="#141414"
            strokeWidth="1.15"
            strokeLinecap="round"
            strokeOpacity="0.55"
          />
          <circle cx="24.2" cy="11.8" r="2.6" fill="#34d399" />
          <circle cx="26.4" cy="20.2" r="1.55" fill="#fafafa" fillOpacity="0.45" />
          <circle cx="21.2" cy="22.4" r="1.55" fill="#fafafa" fillOpacity="0.45" />
          <path
            d="M20.2 11.8h2.4M24.2 14.6v3.1M22.1 21.1l1.6-1.4"
            stroke="#34d399"
            strokeWidth="0.95"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />
        </svg>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              fontSize: "64px",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              fontSize: "30px",
              color: "#a3a3a3",
              letterSpacing: "-0.02em",
            }}
          >
            {SITE_TAGLINE}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          maxWidth: "900px",
        }}
      >
        <div
          style={{
            fontSize: "34px",
            lineHeight: 1.35,
            color: "#e5e5e5",
          }}
        >
          {SITE_DESCRIPTION}
        </div>
        <div
          style={{
            fontSize: "24px",
            color: "#34d399",
            letterSpacing: "0.02em",
          }}
        >
          ragbase.dev
        </div>
      </div>
    </div>
  );
}
