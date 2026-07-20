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

  // Baris ringkasan gaya nota: label & nilai sama-sama rata kanan (satu blok).
  const sumRow = (label: string, value: string, strong = false) => (
    <div style={{ display: "flex", marginTop: 3 }}>
      <span
        style={{
          width: 190,
          textAlign: "right",
          paddingRight: 14,
          fontSize: strong ? 18 : 16,
          fontWeight: strong ? 700 : 400,
        }}
      >
        {label}
      </span>
      <span
        style={{
          width: 140,
          textAlign: "right",
          fontSize: strong ? 18 : 16,
          fontWeight: strong ? 700 : 400,
        }}
      >
        {value}
      </span>
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
          <div style={{ display: "flex", alignItems: "baseline", fontSize: 16, marginBottom: 3 }}>
            <span>{`${d.contactRole} : `}</span>
            <span style={{ fontWeight: 700, fontSize: 19 }}>{d.contactName}</span>
          </div>
          <div style={{ display: "flex", fontSize: 16, marginBottom: 3 }}>
            {`${d.title}: ${d.number}`}
          </div>
          <div style={{ display: "flex", fontSize: 16 }}>{`Tanggal : ${d.dateLabel}`}</div>
        </div>

        {divider}

        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          {/* Header kolom */}
          <div
            style={{
              display: "flex",
              width: "100%",
              fontSize: 15,
              fontWeight: 700,
              color: "#000",
              paddingBottom: 4,
            }}
          >
            <span style={{ flex: 1 }}>Produk</span>
            <span style={{ width: 78, textAlign: "right" }}>Kuantitas</span>
            <span style={{ width: 84, textAlign: "right" }}>Harga</span>
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
              <span style={{ width: 78, textAlign: "right" }}>{it.qty}</span>
              <span style={{ width: 84, textAlign: "right" }}>{it.price}</span>
              <span style={{ width: 104, textAlign: "right", fontWeight: 600 }}>
                {it.total}
              </span>
            </div>
          ))}
        </div>

        {divider}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            alignItems: "flex-end",
          }}
        >
          {sumRow("TOTAL", d.total, true)}
          {sumRow("SISA TAGIHAN", d.sisa, true)}
          {d.bayar && d.bayar !== "0" ? sumRow("Bayar", d.bayar) : null}
          {d.previousDebt && d.totalDebt ? sumRow("Sisa Hutang", d.previousDebt) : null}
          {d.previousDebt && d.totalDebt ? sumRow("Total Hutang", d.totalDebt) : null}
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
