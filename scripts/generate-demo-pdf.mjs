// Generate PDF Rekap (sama persis logikanya dengan src/components/rekap-pdf-button.tsx)
// untuk kontak demo, langsung dari data produksi. Skrip sekali pakai untuk bukti.
import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const g = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^"|"$/g, "") : "";
};
const BASE = g("NEXT_PUBLIC_SUPABASE_URL");
const SRV = g("SUPABASE_SERVICE_ROLE_KEY");
const H = { apikey: SRV, Authorization: `Bearer ${SRV}` };

const formatNumber = (n) => new Intl.NumberFormat("id-ID").format(Number(n) || 0);
const formatRupiah = (n) => "Rp " + formatNumber(n);
const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const formatTanggal = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
};

const contactId = process.argv[2];
if (!contactId) {
  console.error("Pakai: node generate-demo-pdf.mjs <contact_id> <output.pdf>");
  process.exit(1);
}
const outPath = process.argv[3];

const rest = async (p) => {
  const r = await fetch(BASE + "/rest/v1" + p, { headers: H });
  return r.json();
};

const contact = (await rest(`/contacts?select=*&id=eq.${contactId}`))[0];
const sales = await rest(
  `/sales?select=id,number,date,total,paid_total&contact_id=eq.${contactId}&order=date.asc`,
);
const saleIds = sales.map((s) => s.id);
const items = saleIds.length
  ? await rest(
      `/sale_items?select=sale_id,description,qty,unit_price,line_total,price_pending&sale_id=in.(${saleIds.join(",")})&order=sale_id.asc&order=position.asc`,
    )
  : [];
const payments = saleIds.length
  ? await rest(`/payments?select=id,date,amount,method,notes,proof_url&sale_id=in.(${saleIds.join(",")})&order=date.asc`)
  : [];

// Grouping per tanggal -- identik dengan rekap-vendor/page.tsx
const byDate = new Map();
for (const s of sales) {
  if (!byDate.has(s.date)) byDate.set(s.date, { date: s.date, items: [], dayTotal: 0, dayPaid: 0 });
}
const saleById = new Map(sales.map((s) => [s.id, s]));
for (const it of items) {
  const s = saleById.get(it.sale_id);
  byDate.get(s.date).items.push(it);
}
for (const s of sales) {
  const g2 = byDate.get(s.date);
  g2.dayTotal += Number(s.total);
  g2.dayPaid += Number(s.paid_total);
}
const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
const grandTotal = days.reduce((s, d) => s + d.dayTotal, 0);
const totalDibayar = payments.reduce((s, p) => s + Number(p.amount), 0);
const sisa = grandTotal - totalDibayar;
const statusOf = (paid, total) => (paid >= total ? "LUNAS" : paid > 0 ? "SEBAGIAN" : "HUTANG");

const from = days[0]?.date ?? "2026-01-01";
const to = days[days.length - 1]?.date ?? from;

// --- Bangun PDF, identik dengan rekap-pdf-button.tsx ---
const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

doc.setFontSize(14);
doc.text(`Rekap Penjualan — ${contact.name}`, 10, 12);
doc.setFontSize(9);
doc.setTextColor(90);
doc.text(`${formatTanggal(from)} — ${formatTanggal(to)}`, 10, 18);
doc.setTextColor(0);

const head = [["No", "Tanggal", "Barang", "Qty", "Harga", "Jumlah", "Jumlah/Hari", "Status"]];
const body = [];
days.forEach((d, di) => {
  d.items.forEach((it) => {
    body.push([
      String(di + 1),
      formatTanggal(d.date),
      it.description + (it.price_pending ? " (menyusul)" : ""),
      formatNumber(it.qty),
      it.price_pending ? "—" : formatNumber(it.unit_price),
      it.price_pending ? "—" : formatNumber(it.line_total),
      formatRupiah(d.dayTotal),
      statusOf(d.dayPaid, d.dayTotal),
    ]);
  });
});

autoTable(doc, {
  startY: 24,
  head,
  body,
  styles: { fontSize: 8, cellPadding: 1.5 },
  headStyles: { fillColor: [37, 99, 235], textColor: 255 },
  columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
});

const finalY = doc.lastAutoTable?.finalY ?? 24;
let y = finalY + 8;

if (payments.length > 0) {
  doc.setFontSize(11);
  doc.text("Riwayat Pembayaran", 10, y);
  y += 6;
  doc.setFontSize(9);
  for (const p of payments) {
    doc.text(
      `${formatTanggal(p.date)}  ${formatRupiah(p.amount)}${p.method ? "  · " + p.method : ""}`,
      10,
      y,
    );
    y += 6;
  }
  y += 4;
} else {
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("(Belum ada pembayaran tercatat untuk contoh ini)", 10, y);
  doc.setTextColor(0);
  y += 8;
}

const labelX = 248;
const valueX = 287;
doc.setFontSize(10);
doc.text("TOTAL", labelX, y, { align: "right" });
doc.text(formatRupiah(grandTotal), valueX, y, { align: "right" });
doc.text("Dibayar", labelX, y + 6, { align: "right" });
doc.text(formatRupiah(totalDibayar), valueX, y + 6, { align: "right" });
doc.setFont("helvetica", "bold");
doc.text(sisa <= 0 ? "LUNAS" : "SISA", labelX, y + 13, { align: "right" });
doc.text(formatRupiah(Math.max(0, sisa)), valueX, y + 13, { align: "right" });
doc.setFont("helvetica", "normal");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, Buffer.from(doc.output("arraybuffer")));
console.log("PDF tersimpan:", outPath);
console.log("TOTAL:", formatRupiah(grandTotal), "| Dibayar:", formatRupiah(totalDibayar), "| Sisa:", formatRupiah(sisa));
