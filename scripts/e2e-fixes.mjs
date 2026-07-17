// Verifikasi perbaikan: ledger stok (opening/adjustment), opname, edit persist,
// CATATAN: JANGAN reset document_counters — nomor nota dipakai data asli;
// meresetnya membuat nota berikutnya bentrok & gagal disimpan.
// dan guard diskon (CHECK 0..100). Self-cleaning.
const URL = process.env.SUPABASE_URL;
const ANON = process.env.ANON;
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

const results = [];
function check(name, cond, detail = "") {
  results.push({ ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}${detail ? `  (${detail})` : ""}`);
}
const num = (x) => Number(x);
let token = ANON;

async function rest(method, path, { body, prefer } = {}) {
  const res = await fetch(`${URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return data;
}
const REP = "return=representation";
const ts = Date.now();

async function main() {
  const lr = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  token = (await lr.json()).access_token;
  check("Login", !!token);

  // --- Ledger stok: opening movement menyetel stok (tidak dobel) ---
  const [prod] = await rest("POST", "/products", {
    prefer: REP,
    body: { name: `_Fix Ikan ${ts}`, buy_price: 20000, sell_price: 25000, track_stock: true },
  });
  await rest("POST", "/stock_movements", {
    body: { product_id: prod.id, qty: 25, ref_kind: "opening", note: "Stok awal" },
  });
  let s = await rest("GET", `/products?id=eq.${prod.id}&select=stock`);
  check("Opening movement menyetel stok (single count)", num(s[0].stock) === 25, `stok=${s[0].stock} (harap 25)`);

  // --- Edit produk persist (harga beli) ---
  await rest("PATCH", `/products?id=eq.${prod.id}`, { body: { buy_price: 22222 } });
  const e = await rest("GET", `/products?id=eq.${prod.id}&select=buy_price`);
  check("Edit produk tersimpan", num(e[0].buy_price) === 22222, `buy_price=${e[0].buy_price}`);

  // --- Opname (adjust_stock) ---
  await rest("POST", "/rpc/adjust_stock", { body: { p_product: prod.id, p_actual: 10, p_note: "opname test" } });
  s = await rest("GET", `/products?id=eq.${prod.id}&select=stock`);
  check("Opname set stok aktual = 10 (selisih -15)", num(s[0].stock) === 10, `stok=${s[0].stock}`);

  await rest("POST", "/rpc/adjust_stock", { body: { p_product: prod.id, p_actual: 10 } });
  s = await rest("GET", `/products?id=eq.${prod.id}&select=stock`);
  check("Opname tanpa selisih tidak mengubah stok", num(s[0].stock) === 10, `stok=${s[0].stock}`);

  const movs = await rest("GET", `/stock_movements?product_id=eq.${prod.id}&select=ref_kind,qty&order=created_at`);
  check("Ledger stok terisi (opening + adjustment)",
    movs.some((m) => m.ref_kind === "opening") && movs.some((m) => m.ref_kind === "adjustment"),
    movs.map((m) => `${m.ref_kind}:${m.qty}`).join(", "));

  // --- Guard diskon: CHECK 0..100 menolak diskon 150 ---
  const [sup] = await rest("POST", "/contacts", { prefer: REP, body: { type: "supplier", name: `_Fix Sup ${ts}` } });
  const number = await rest("POST", "/rpc/next_doc_number", { body: { p_doc_type: "purchase" } });
  const [pur] = await rest("POST", "/purchases", { prefer: REP, body: { number, contact_id: sup.id, status: "unpaid" } });
  let discountRejected = false;
  try {
    await rest("POST", "/purchase_items", {
      body: [{ purchase_id: pur.id, product_id: prod.id, description: "x", qty: 1, unit_price: 10000, discount_pct: 150, tax_pct: 0, position: 0 }],
    });
  } catch {
    discountRejected = true;
  }
  check("Diskon >100% ditolak DB (CHECK constraint)", discountRejected);

  // Item valid tetap bisa (diskon 20%)
  await rest("POST", "/purchase_items", {
    body: [{ purchase_id: pur.id, product_id: prod.id, description: "x", qty: 2, unit_price: 10000, discount_pct: 20, tax_pct: 0, position: 0 }],
  });
  const [pRow] = await rest("GET", `/purchases?id=eq.${pur.id}&select=total`);
  check("Item diskon valid dihitung (2*10000*0.8=16000)", num(pRow.total) === 16000, `total=${pRow.total}`);

  // --- Cleanup ---
  await rest("DELETE", `/purchases?id=eq.${pur.id}`);
  await rest("DELETE", `/products?id=eq.${prod.id}`);
  await rest("DELETE", `/contacts?id=eq.${sup.id}`);
  const left = await rest("GET", `/products?id=eq.${prod.id}&select=id`);
  check("Cleanup selesai", left.length === 0);
}

main()
  .then(() => {
    const pass = results.filter((r) => r.ok).length;
    console.log(`\n===== ${pass}/${results.length} lulus =====`);
    process.exit(pass === results.length ? 0 : 1);
  })
  .catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
