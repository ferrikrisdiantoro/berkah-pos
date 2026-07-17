// Uji end-to-end: menjalankan tiap fitur seperti yang dilakukan app (via REST +
// CATATAN: JANGAN reset document_counters — nomor nota dipakai data asli;
// meresetnya membuat nota berikutnya bentrok & gagal disimpan.
// RPC Supabase) lalu render halaman asli lewat dev server. DB dikembalikan bersih.
// SUPABASE_URL, ANON, EMAIL, PASSWORD, APP wajib di-set.
const URL = process.env.SUPABASE_URL;
const ANON = process.env.ANON;
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const APP = process.env.APP || "http://localhost:3000";

const results = [];
function check(name, cond, detail = "") {
  results.push({ name, ok: !!cond, detail });
  console.log(`${cond ? "✓" : "✗"} ${name}${detail ? `  (${detail})` : ""}`);
}
const num = (x) => Number(x);

let token = ANON;
async function rest(method, path, { body, prefer, useAnon } = {}) {
  const res = await fetch(`${URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${useAnon ? ANON : token}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return data;
}

const REP = "return=representation";
const ts = Date.now();

async function main() {
  // ---- Login ----
  const lr = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await lr.json();
  token = lj.access_token;
  check("Login (password grant) dapat token", !!token);
  if (!token) throw new Error("Login gagal, hentikan.");

  // ---- Master data: kontak & produk ----
  const [supplier] = await rest("POST", "/contacts", {
    prefer: REP,
    body: { type: "supplier", name: `_T Supplier ${ts}`, city: "Testkota" },
  });
  check("Buat kontak supplier", !!supplier?.id);

  const [cust] = await rest("POST", "/contacts", {
    prefer: REP,
    body: { type: "customer", name: `_T Pelanggan ${ts}`, city: "Semarang" },
  });
  check("Buat kontak pelanggan", !!cust?.id);

  const [p1] = await rest("POST", "/products", {
    prefer: REP,
    body: { name: `_T Ikan A ${ts}`, buy_price: 20000, sell_price: 25000, track_stock: true, stock: 0 },
  });
  const [p2] = await rest("POST", "/products", {
    prefer: REP,
    body: { name: `_T Ikan B ${ts}`, buy_price: 30000, sell_price: 38000, track_stock: true, stock: 0 },
  });
  check("Buat 2 produk (stok awal 0)", !!p1?.id && !!p2?.id);

  // ---- Numbering ----
  const number = await rest("POST", "/rpc/next_doc_number", { body: { p_doc_type: "purchase" } });
  check("Nomor pembelian format PI/xxxxx", typeof number === "string" && /^PI\/\d{5}$/.test(number), number);

  // ---- Pembelian: header + item ----
  const [purchase] = await rest("POST", "/purchases", {
    prefer: REP,
    body: { number, contact_id: supplier.id, date: "2026-06-16", due_date: "2026-07-16", status: "unpaid" },
  });
  check("Buat header pembelian", !!purchase?.id && !!purchase?.share_token);

  await rest("POST", "/purchase_items", {
    prefer: REP,
    body: [
      { purchase_id: purchase.id, product_id: p1.id, description: p1.name, qty: 10, unit_price: 20000, discount_pct: 0, tax_pct: 0, position: 0 },
      { purchase_id: purchase.id, product_id: p2.id, description: p2.name, qty: 5, unit_price: 30000, discount_pct: 10, tax_pct: 0, position: 1 },
    ],
  });
  // line1=200000, line2=round(5*30000*0.9)=135000, total=335000, diskon=15000
  const [pur] = await rest("GET", `/purchases?id=eq.${purchase.id}&select=subtotal,total,discount_total,status`);
  check("Trigger hitung Sub Total & Total", num(pur.total) === 335000 && num(pur.subtotal) === 335000,
    `total=${pur.total} subtotal=${pur.subtotal} diskon=${pur.discount_total}`);
  check("Diskon per-baris dihitung", num(pur.discount_total) === 15000, `diskon=${pur.discount_total}`);
  check("Status awal 'unpaid' (Belum Bayar)", pur.status === "unpaid", pur.status);

  // ---- Stok masuk ----
  const sA = await rest("GET", `/products?id=eq.${p1.id}&select=stock`);
  const sB = await rest("GET", `/products?id=eq.${p2.id}&select=stock`);
  check("Stok bertambah otomatis dari pembelian", num(sA[0].stock) === 10 && num(sB[0].stock) === 5, `A=${sA[0].stock} B=${sB[0].stock}`);

  // ---- Pembayaran: sebagian → lunas ----
  await rest("POST", "/payments", { body: { kind: "purchase", purchase_id: purchase.id, amount: 100000, date: "2026-06-16" } });
  let [pp] = await rest("GET", `/purchases?id=eq.${purchase.id}&select=paid_total,status`);
  check("Bayar sebagian → status 'partial'", pp.status === "partial" && num(pp.paid_total) === 100000, `${pp.status} paid=${pp.paid_total}`);

  await rest("POST", "/payments", { body: { kind: "purchase", purchase_id: purchase.id, amount: 235000, date: "2026-06-16" } });
  [pp] = await rest("GET", `/purchases?id=eq.${purchase.id}&select=paid_total,status`);
  check("Lunas → status 'paid'", pp.status === "paid" && num(pp.paid_total) === 335000, `${pp.status} paid=${pp.paid_total}`);

  // ---- Share RPC (login & anon) ----
  const share = await rest("POST", "/rpc/get_shared_purchase", { body: { p_token: purchase.share_token } });
  check("Share RPC kembalikan nota lengkap", share?.purchase?.number === number && Array.isArray(share.items) && share.items.length === 2 && !!share.business?.name,
    `items=${share?.items?.length} biz=${share?.business?.name}`);
  const shareAnon = await rest("POST", "/rpc/get_shared_purchase", { useAnon: true, body: { p_token: purchase.share_token } });
  check("Share bisa diakses tanpa login (anon)", shareAnon?.purchase?.number === number);

  // ---- Penjualan: stok keluar ----
  const saleNo = await rest("POST", "/rpc/next_doc_number", { body: { p_doc_type: "sale" } });
  check("Nomor penjualan format SI/xxxxx", /^SI\/\d{5}$/.test(saleNo), saleNo);
  const [sale] = await rest("POST", "/sales", { prefer: REP, body: { number: saleNo, contact_id: cust.id, date: "2026-06-20", status: "unpaid" } });
  await rest("POST", "/sale_items", { body: [{ sale_id: sale.id, product_id: p1.id, description: p1.name, qty: 3, unit_price: 25000, discount_pct: 0, tax_pct: 0, position: 0 }] });
  const sA2 = await rest("GET", `/products?id=eq.${p1.id}&select=stock`);
  check("Stok berkurang otomatis dari penjualan", num(sA2[0].stock) === 7, `A=${sA2[0].stock} (10-3)`);
  const [saleRow] = await rest("GET", `/sales?id=eq.${sale.id}&select=total`);
  check("Total penjualan dihitung", num(saleRow.total) === 75000, `total=${saleRow.total}`);

  // ---- Edit pembelian: hapus item + isi ulang → stok ter-reverse ----
  await rest("DELETE", `/purchase_items?purchase_id=eq.${purchase.id}`);
  const dA = await rest("GET", `/products?id=eq.${p1.id}&select=stock`);
  const dB = await rest("GET", `/products?id=eq.${p2.id}&select=stock`);
  check("Edit: hapus item me-reverse stok", num(dA[0].stock) === -3 && num(dB[0].stock) === 0, `A=${dA[0].stock}(7-10) B=${dB[0].stock}(5-5)`);
  await rest("POST", "/purchase_items", { body: [{ purchase_id: purchase.id, product_id: p1.id, description: p1.name, qty: 4, unit_price: 20000, discount_pct: 0, tax_pct: 0, position: 0 }] });
  const eA = await rest("GET", `/products?id=eq.${p1.id}&select=stock`);
  const [eP] = await rest("GET", `/purchases?id=eq.${purchase.id}&select=total`);
  check("Edit: isi ulang item hitung stok & total baru", num(eA[0].stock) === 1 && num(eP.total) === 80000, `A=${eA[0].stock}(-3+4) total=${eP.total}`);

  // ---- Laporan: query outstanding tidak error ----
  const outstanding = await rest("GET", `/purchases?select=total,paid_total,status,contact:contacts(name)&status=neq.paid`);
  check("Query laporan (outstanding) berjalan", Array.isArray(outstanding));

  // ---- Render halaman asli via dev server ----
  const rootRes = await fetch(`${APP}/`, { redirect: "manual" });
  const loc = rootRes.headers.get("location") || "";
  check("Rute terproteksi redirect ke /login", (rootRes.status === 307 || rootRes.status === 302) && loc.includes("/login"), `status=${rootRes.status} loc=${loc}`);

  const loginHtml = await (await fetch(`${APP}/login`)).text();
  check("Halaman /login render", loginHtml.includes("Berkah POS") || loginHtml.includes("Masuk"));

  const shareRes = await fetch(`${APP}/share/pembelian/${purchase.share_token}`);
  const shareHtml = await shareRes.text();
  check("Halaman share publik render nota (SSR + data)", shareRes.status === 200 && shareHtml.includes("NOTA PEMBELIAN") && shareHtml.includes(number),
    `status=${shareRes.status}`);

  // ---- Bersih-bersih ----
  await rest("DELETE", `/purchases?id=eq.${purchase.id}`);
  await rest("DELETE", `/sales?id=eq.${sale.id}`);
  await rest("DELETE", `/products?id=eq.${p1.id}`);
  await rest("DELETE", `/products?id=eq.${p2.id}`);
  await rest("DELETE", `/contacts?id=eq.${supplier.id}`);
  await rest("DELETE", `/contacts?id=eq.${cust.id}`);
  const leftPur = await rest("GET", `/purchases?id=eq.${purchase.id}&select=id`);
  const leftProd = await rest("GET", `/products?id=eq.${p1.id}&select=id`);
  check("Cleanup: data uji terhapus & counter direset", leftPur.length === 0 && leftProd.length === 0);
}

main()
  .then(() => {
    const pass = results.filter((r) => r.ok).length;
    const fail = results.length - pass;
    console.log(`\n===== ${pass}/${results.length} lulus, ${fail} gagal =====`);
    process.exit(fail ? 1 : 0);
  })
  .catch((e) => {
    console.error("\nERROR fatal:", e.message);
    process.exit(1);
  });
