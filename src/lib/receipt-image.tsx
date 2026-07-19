import { ImageResponse } from "next/og";
import type { ReceiptData } from "@/lib/native-print";

const W = 480;

/** Render struk 58mm menjadi gambar PNG (untuk dibagikan ke WhatsApp). */
export function renderReceiptImage(d: ReceiptData, logoUrl?: string | null) {
  // Tinggi kanvas dibuat longgar agar bagian bawah (Sisa & footer) tidak terpotong.
  const height =
    400 +
    d.items.length * 44 +
    (logoUrl ? 140 : 0) +
    (d.items.some((it) => it.pending) ? 34 : 0) +
    (d.previousDebt && d.totalDebt ? 72 : 0);

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
          <div
            style={{ display: "flex", fontSize: 24, fontWeight: 700, marginTop: 6, color: "#1d4ed8" }}
          >
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
          <div style={{ display: "flex", fontSize: 12, color: "#555", marginTop: 4 }}>
            {d.contactRole}
          </div>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
            {d.contactName}
          </div>
        </div>

        {divider}

        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          {/* Header kolom */}
          <div
            style={{
              display: "flex",
              width: "100%",
              fontSize: 12,
              fontWeight: 700,
              color: "#555",
              paddingBottom: 4,
            }}
          >
            <span style={{ flex: 1 }}>Produk</span>
            <span style={{ width: 48, textAlign: "right" }}>Qty</span>
            <span style={{ width: 92, textAlign: "right" }}>Harga</span>
            <span style={{ width: 104, textAlign: "right" }}>Jumlah</span>
          </div>
          {d.items.map((it, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                width: "100%",
                fontSize: 15,
                marginBottom: 4,
                alignItems: "flex-start",
              }}
            >
              <span style={{ flex: 1, fontWeight: 600, paddingRight: 4 }}>
                {it.description + (it.pending ? " *" : "")}
              </span>
              <span style={{ width: 48, textAlign: "right" }}>{it.qty}</span>
              <span style={{ width: 92, textAlign: "right" }}>{it.price}</span>
              <span style={{ width: 104, textAlign: "right", fontWeight: 600 }}>
                {it.total}
              </span>
            </div>
          ))}
        </div>

        {divider}

        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          {row("Subtotal", d.subtotal)}
          {row("TOTAL", d.total, true)}
          {row("Bayar", d.bayar)}
          {row("Sisa Tagihan", d.sisa)}
          {d.previousDebt && d.totalDebt
            ? row("Tunggakan lain", d.previousDebt)
            : null}
          {d.previousDebt && d.totalDebt
            ? row("TOTAL HUTANG", d.totalDebt, true)
            : null}
          {d.items.some((it) => it.pending) && (
            <div style={{ display: "flex", fontSize: 13, color: "#b45309", marginTop: 4 }}>
              *total belum final (ada harga menyusul)
            </div>
          )}
        </div>

        {divider}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          {d.footer && <div style={{ display: "flex", fontSize: 13 }}>{d.footer}</div>}
          {d.bankInfo && (
            <div style={{ display: "flex", fontSize: 13, fontWeight: 700, marginTop: 4, textAlign: "center" }}>
              {d.bankInfo}
            </div>
          )}
          {d.signature && <div style={{ display: "flex", fontSize: 12, marginTop: 2 }}>{d.signature}</div>}
        </div>
      </div>
    ),
    { width: W, height },
  );
}
