import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #FFF8E1 0%, #FDE68A 100%)",
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
              background: "#D97706",
              opacity: 0.9,
            }}
          />
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#F59E0B",
              opacity: 0.9,
              marginLeft: "-12px",
            }}
          />
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#FBBF24",
              opacity: 0.9,
              marginLeft: "-12px",
            }}
          />
        </div>
        <div
          style={{
            fontSize: "64px",
            fontWeight: "bold",
            background: "linear-gradient(135deg, #D97706, #F59E0B)",
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
            color: "#2D2416",
            fontWeight: "600",
          }}
        >
          Split the bill in seconds
        </div>
        <div
          style={{
            fontSize: "18px",
            color: "#8A7353",
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
