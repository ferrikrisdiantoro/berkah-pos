import { ImageResponse } from "next/og";

// Ikon PWA dibuat dinamis (tanpa file gambar). /icons/192 & /icons/512
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  const s = Math.min(1024, Math.max(48, Number(size) || 512));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#1e3a8a,#2563eb)",
          color: "#fff",
          fontSize: s * 0.42,
          fontWeight: 800,
          letterSpacing: -2,
        }}
      >
        BM
      </div>
    ),
    { width: s, height: s },
  );
}
