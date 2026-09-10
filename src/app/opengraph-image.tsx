import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

export const alt = siteConfig.tagline;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
          background: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "#2b3d8f",
            }}
          />
          <span style={{ fontSize: 30, fontWeight: 600, color: "#0a0a0a" }}>
            {siteConfig.name}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 60,
            fontWeight: 600,
            color: "#0a0a0a",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            maxWidth: 920,
          }}
        >
          {siteConfig.tagline}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: "#737373",
            marginTop: 28,
          }}
        >
          {siteConfig.price}{siteConfig.priceInterval} · {siteConfig.trialDays} dias grátis
        </div>
      </div>
    ),
    { ...size }
  );
}
