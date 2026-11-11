import { ImageResponse } from "next/og";

/**
 * Social share card.
 *
 * The metadata already declared `twitter.card = "summary_large_image"` but no
 * image existed, so every share rendered a blank box — worse than declaring a
 * plain summary card.
 *
 * Drawn with system fonts on purpose. `next/font` fetches from Google at build
 * time, and a rotated font URL has already broken a production build once; an
 * OG image is not worth a second build-time dependency on that.
 */
export const runtime = "edge";
export const alt =
  "Recoverly — private alcohol-recovery tracking, gentle insights, and a non-judgmental AI coach";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0b1120 0%, #0f2027 55%, #10352c 100%)",
          fontFamily: "system-ui, sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
          {/* The same drawing as public/icon.svg. Inline SVG is supported by the
              image renderer; it needs explicit width and height. */}
          <svg width="64" height="64" viewBox="0 0 512 512">
            <defs>
              <linearGradient id="rv-og" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#10b981" />
                <stop offset="1" stopColor="#0284c7" />
              </linearGradient>
            </defs>
            <rect width="512" height="512" rx="116" fill="url(#rv-og)" />
            <g transform="translate(256 256) scale(1.08) translate(-256 -256)">
              <path
                d="M178 394V134h88a76 76 0 0 1 0 152h-88M254 286l92 108"
                fill="none"
                stroke="#ffffff"
                strokeWidth="54"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="392" cy="132" r="30" fill="#fde68a" />
            </g>
          </svg>
          <div style={{ fontSize: 40, fontWeight: 600, color: "#f8fafc" }}>Recoverly</div>
        </div>

        {/* Satori requires an explicit display on any element with more than one
            child, so the headline is a flex row of spans rather than mixed
            inline content. Without it the route compiles but 500s at runtime. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontSize: 66,
            fontWeight: 700,
            color: "#f8fafc",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: 28
          }}
        >
          <span>Every step toward&nbsp;</span>
          <span style={{ color: "#34d399" }}>awareness</span>
          <span>&nbsp;counts.</span>
        </div>

        <div style={{ fontSize: 30, color: "#94a3b8", lineHeight: 1.4, maxWidth: 900 }}>
          Private alcohol-recovery tracking, gentle insights, and a non-judgmental AI coach —
          free, in nine Indian languages.
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 44 }}>
          {["No shaming, ever", "Private by design", "Real helplines"].map((chip) => (
            <div
              key={chip}
              style={{
                fontSize: 24,
                color: "#cbd5e1",
                border: "1px solid rgba(148,163,184,0.35)",
                borderRadius: 999,
                padding: "10px 22px"
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
