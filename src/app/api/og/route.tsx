import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", gap: "-12px", marginBottom: "24px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#0F766E",
              opacity: 0.9,
            }}
          />
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#14B8A6",
              opacity: 0.9,
              marginLeft: "-12px",
            }}
          />
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#99F6E4",
              opacity: 0.9,
              marginLeft: "-12px",
            }}
          />
        </div>
        <div
          style={{
            fontSize: "64px",
            fontWeight: "bold",
            background: "linear-gradient(135deg, #0F766E, #14B8A6)",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: "16px",
          }}
        >
          Partake
        </div>
        <div
          style={{
            fontSize: "28px",
            color: "#0F172A",
            fontWeight: "600",
          }}
        >
          Split the bill in seconds
        </div>
        <div
          style={{
            fontSize: "18px",
            color: "#64748B",
            marginTop: "12px",
          }}
        >
          Scan • Claim • Pay
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
