import { ImageResponse } from "next/og";
import type { ReceiptData } from "@/lib/native-print";

const W = 480;

/** Render struk 58mm menjadi gambar PNG (untuk dibagikan ke WhatsApp). */
export function renderReceiptImage(d: ReceiptData, logoUrl?: string | null) {
  // Tinggi kanvas dibuat longgar agar bagian bawah (Sisa & footer) tidak terpotong.
  const height = 350 + d.items.length * 62 + (logoUrl ? 140 : 0);

  const row = (left: string, right: string, bold = false) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        width: "100%",
        fontSize: bold ? 20 : 16,
        fontWeight: bold ? 700 : 400,
        marginTop: 2,
      }}
    >
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );

  const divider = (
    <div
      style={{
        display: "flex",
        width: "100%",
        borderBottom: "2px dashed #999",
        marginTop: 8,
        marginBottom: 8,
      }}
    />
  );

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#fff",
          color: "#000",
          padding: 24,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" width={110} height={110} style={{ objectFit: "contain" }} />
          )}
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, marginTop: 6 }}>
            {d.storeName}
          </div>
          {d.address && (
            <div
              style={{
                display: "flex",
                fontSize: 13,
                textAlign: "center",
                marginTop: 2,
              }}
            >
              {d.address}
            </div>
          )}
          {d.phone && (
            <div style={{ display: "flex", fontSize: 13 }}>{`Telp: ${d.phone}`}</div>
          )}
        </div>

        {divider}

        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          {row(d.title, "")}
          {row("No", d.number)}
          {row("Tgl", d.dateLabel)}
          {row(d.contactRole, d.contactName)}
        </div>

        {divider}

        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          {d.items.map((it, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", width: "100%", marginBottom: 6 }}>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{it.description}</div>
              {row(it.qtyPrice, it.total)}
            </div>
          ))}
        </div>

        {divider}

        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          {row("Subtotal", d.subtotal)}
          {row("TOTAL", d.total, true)}
          {row("Bayar", d.bayar)}
          {row("Sisa", d.sisa)}
        </div>

        {divider}

        <div style={{ display: "flex", justifyContent: "center", width: "100%", fontSize: 13 }}>
          {d.footer ?? `--- ${d.storeName} ---`}
        </div>
      </div>
    ),
    { width: W, height },
  );
}
