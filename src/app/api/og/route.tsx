import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #FBF8F4 0%, #F5EDE3 100%)",
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
              background: "#E8613C",
              opacity: 0.9,
            }}
          />
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#F4A261",
              opacity: 0.9,
              marginLeft: "-12px",
            }}
          />
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#FFD6A5",
              opacity: 0.9,
              marginLeft: "-12px",
            }}
          />
        </div>
        <div
          style={{
            fontSize: "64px",
            fontWeight: "bold",
            background: "linear-gradient(135deg, #E8613C, #F4A261)",
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
            color: "#2D2319",
            fontWeight: "600",
          }}
        >
          Split the bill in seconds
        </div>
        <div
          style={{
            fontSize: "18px",
            color: "#9C8E80",
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
