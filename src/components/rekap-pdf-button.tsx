"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNativeApp, sharePdfNative } from "@/lib/native-print";
import { formatRupiah, formatNumber, formatTanggal } from "@/lib/utils";

export type RekapPdfRow = {
  no: number;
  date: string;
  description: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  vendorQty: number | null;
  susut: number | null;
  pending: boolean;
  dayTotal: number;
  status: string;
};

export type RekapPdfPayment = {
  date: string;
  amount: number;
  method: string | null;
  notes: string | null;
  proofUrl: string | null;
};

export type RekapPdfData = {
  title: string;
  contactName: string;
  contactPhone: string | null;
  from: string;
  to: string;
  rows: RekapPdfRow[];
  payments: RekapPdfPayment[];
  grandTotal: number;
  totalDibayar: number;
  sisa: number;
  showVendorQty: boolean;
};

/**
 * Bikin PDF dari rekap (client-side, jsPDF) lalu unduh (browser) atau bagikan
 * lewat share sheet native (APK — WebView Android tak dukung window.print()).
 */
export function RekapPdfButton({ data }: { data: RekapPdfData }) {
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTableMod = await import("jspdf-autotable");
      const autoTable = autoTableMod.default;

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      doc.setFontSize(14);
      doc.text(`${data.title} — ${data.contactName}`, 10, 12);
      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(
        `${formatTanggal(data.from)} — ${formatTanggal(data.to)}` +
          (data.contactPhone ? `  ·  Telp: ${data.contactPhone}` : ""),
        10,
        18,
      );
      doc.setTextColor(0);

      const head = data.showVendorQty
        ? [["No", "Tanggal", "Barang", "Qty", "Harga", "Jumlah", "Qty Vendor", "Susut", "Jumlah/Hari", "Status"]]
        : [["No", "Tanggal", "Barang", "Qty", "Harga", "Jumlah", "Jumlah/Hari", "Status"]];

      const body = data.rows.map((r) => {
        const row: (string | number)[] = [
          r.no,
          formatTanggal(r.date),
          r.description + (r.pending ? " (menyusul)" : ""),
          formatNumber(r.qty),
          r.pending ? "—" : formatNumber(r.unitPrice),
          r.pending ? "—" : formatNumber(r.lineTotal),
        ];
        if (data.showVendorQty) {
          row.push(r.vendorQty == null ? "—" : formatNumber(r.vendorQty));
          row.push(r.susut == null ? "—" : formatNumber(r.susut));
        }
        row.push(formatRupiah(r.dayTotal));
        row.push(r.status);
        return row;
      });

      autoTable(doc, {
        startY: 24,
        head,
        body,
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
        columnStyles: {
          3: { halign: "right" },
          4: { halign: "right" },
          5: { halign: "right" },
          ...(data.showVendorQty
            ? { 6: { halign: "right" }, 7: { halign: "right" }, 8: { halign: "right" } }
            : { 6: { halign: "right" } }),
        },
      });

      const finalY =
        (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 24;
      let y = finalY + 8;
      const pageHeight = doc.internal.pageSize.getHeight();

      if (data.payments.length > 0) {
        doc.setFontSize(11);
        doc.text("Riwayat Pembayaran", 10, y);
        y += 6;
        doc.setFontSize(8.5);
        for (const p of data.payments) {
          if (y > pageHeight - 20) {
            doc.addPage();
            y = 15;
          }
          const line =
            `${formatTanggal(p.date)}  ${formatRupiah(p.amount)}` +
            (p.method ? `  · ${p.method}` : "") +
            (p.notes ? `  · ${p.notes}` : "");
          if (p.proofUrl) {
            try {
              doc.addImage(p.proofUrl, "JPEG", 10, y, 16, 16);
            } catch {
              // Lewati gambar yang gagal di-embed (format tak didukung), teks tetap tampil.
            }
            doc.text(line, 30, y + 9);
            y += 20;
          } else {
            doc.text(line, 10, y);
            y += 6;
          }
        }
        y += 4;
      }

      if (y > pageHeight - 30) {
        doc.addPage();
        y = 15;
      }
      // Label rata kanan + nilai rata kanan di kolom terpisah, jarak cukup
      // lebar (39mm) supaya angka besar (mis. Rp 999.999.999) tak bertabrakan
      // dengan labelnya — sebelumnya "TOTAL" & nilainya sempat nempel jadi
      // "TOTALRp ...".
      const labelX = 248;
      const valueX = 287;
      doc.setFontSize(10);
      doc.text("TOTAL", labelX, y, { align: "right" });
      doc.text(formatRupiah(data.grandTotal), valueX, y, { align: "right" });
      doc.text("Dibayar", labelX, y + 6, { align: "right" });
      doc.text(formatRupiah(data.totalDibayar), valueX, y + 6, { align: "right" });
      doc.setFont("helvetica", "bold");
      const sisaLabel = data.sisa <= 0 ? "LUNAS" : "SISA";
      doc.text(sisaLabel, labelX, y + 13, { align: "right" });
      doc.text(formatRupiah(Math.max(0, data.sisa)), valueX, y + 13, { align: "right" });
      doc.setFont("helvetica", "normal");

      const safeName = data.contactName.replace(/[^\w-]/g, "") || "kontak";
      const filename = `Rekap-${safeName}-${data.from}_${data.to}.pdf`;

      if (isNativeApp()) {
        const dataUri = doc.output("datauristring");
        const base64 = dataUri.split(",")[1] ?? "";
        const res = await sharePdfNative(base64, filename, `${data.title} ${data.contactName}`);
        if (!res.ok) toast.error(res.error ?? "Gagal membagikan PDF.");
      } else {
        doc.save(filename);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={generate} disabled={busy}>
      <FileDown className="h-4 w-4" /> {busy ? "Membuat PDF…" : "Unduh / Bagikan PDF"}
    </Button>
  );
}
