// Uji Modul A: konsinyasi (titip jual) + komisi + hak pemilik. Self-cleaning.
const URL = process.env.SUPABASE_URL, ANON = process.env.ANON;
const EMAIL = process.env.EMAIL, PASSWORD = process.env.PASSWORD;
const results = [];
const check = (n, ok, d = "") => { results.push(!!ok); console.log(`${ok ? "✓" : "✗"} ${n}${d ? `  (${d})` : ""}`); };
const num = (x) => Number(x);
let token = ANON;
async function rest(method, path, { body, prefer } = {}) {
  const res = await fetch(`${URL}/rest/v1${path}`, {
    method,
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const t = await res.text(); let d; try { d = t ? JSON.parse(t) : null; } catch { d = t; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${t}`);
  return d;
}
const REP = "return=representation", ts = Date.now();

async function main() {
  token = (await (await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })).json()).access_token;
  check("Login", !!token);

  // Pemilik barang + pelanggan + produk (stok 50)
  const [owner] = await rest("POST", "/contacts", { prefer: REP, body: { type: "supplier", name: `_K Pemilik ${ts}` } });
  const [cust] = await rest("POST", "/contacts", { prefer: REP, body: { type: "customer", name: `_K Pelanggan ${ts}` } });
  const [prod] = await rest("POST", "/products", { prefer: REP, body: { name: `_K Ikan ${ts}`, track_stock: true, buy_price: 20000, sell_price: 30000 } });
  await rest("POST", "/stock_movements", { body: { product_id: prod.id, qty: 50, ref_kind: "opening" } });

  // Titipan 1: komisi PERSEN 10%
  const [con1] = await rest("POST", "/consignments", { prefer: REP, body: {
    owner_id: owner.id, product_id: prod.id, product_name: "Ikan Titipan", unit: "Kg",
    qty_in: 100, qty_remaining: 100, base_price: 25000, commission_type: "percent", commission_value: 10 } });
  // Titipan 2: komisi PER-UNIT Rp 2000
  const [con2] = await rest("POST", "/consignments", { prefer: REP, body: {
    owner_id: owner.id, product_id: prod.id, product_name: "Ikan Titipan 2", unit: "Kg",
    qty_in: 50, qty_remaining: 50, base_price: 25000, commission_type: "fixed_per_unit", commission_value: 2000 } });
  check("Buat 2 titipan", !!con1?.id && !!con2?.id);

  // Nota jual: baris titipan 1 (qty 20 @30000) + titipan 2 (qty 10 @30000)
  const saleNo = await rest("POST", "/rpc/next_doc_number", { body: { p_doc_type: "sale" } });
  const [sale] = await rest("POST", "/sales", { prefer: REP, body: { number: saleNo, contact_id: cust.id, status: "unpaid" } });
  await rest("POST", "/sale_items", { body: [
    { sale_id: sale.id, consignment_id: con1.id, description: "Titipan 1", qty: 20, unit_price: 30000, discount_pct: 0, tax_pct: 0, position: 0 },
    { sale_id: sale.id, consignment_id: con2.id, description: "Titipan 2", qty: 10, unit_price: 30000, discount_pct: 0, tax_pct: 0, position: 1 },
  ] });

  const its = await rest("GET", `/sale_items?sale_id=eq.${sale.id}&select=consignment_id,commission_amount,owner_amount,owner_id&order=position`);
  const i1 = its.find((x) => x.consignment_id === con1.id);
  const i2 = its.find((x) => x.consignment_id === con2.id);
  // Persen 10%: sub 600000 -> komisi 60000, hak 540000
  check("Komisi PERSEN dihitung (trigger)", num(i1.commission_amount) === 60000 && num(i1.owner_amount) === 540000, `komisi=${i1.commission_amount} hak=${i1.owner_amount}`);
  // Per-unit 2000 x10: komisi 20000, hak 280000
  check("Komisi PER-UNIT dihitung (trigger)", num(i2.commission_amount) === 20000 && num(i2.owner_amount) === 280000, `komisi=${i2.commission_amount} hak=${i2.owner_amount}`);
  check("owner_id terisi otomatis", i1.owner_id === owner.id && i2.owner_id === owner.id);

  // Sisa titipan berkurang
  const c1 = await rest("GET", `/consignments?id=eq.${con1.id}&select=qty_remaining`);
  const c2 = await rest("GET", `/consignments?id=eq.${con2.id}&select=qty_remaining,status`);
  check("Sisa titipan berkurang", num(c1[0].qty_remaining) === 80 && num(c2[0].qty_remaining) === 40, `c1=${c1[0].qty_remaining} c2=${c2[0].qty_remaining}`);

  // Stok produk TIDAK berkurang oleh penjualan titipan
  const ps = await rest("GET", `/products?id=eq.${prod.id}&select=stock`);
  check("Stok produk toko tidak terpengaruh titipan", num(ps[0].stock) === 50, `stok=${ps[0].stock}`);

  // Hak pemilik total = 540000 + 280000 = 820000; bayar 100000 -> sisa 720000
  await rest("POST", "/owner_payments", { body: { owner_id: owner.id, amount: 100000 } });
  const acc = (await rest("GET", `/sale_items?owner_id=eq.${owner.id}&select=owner_amount`)).reduce((s, x) => s + num(x.owner_amount), 0);
  const pay = (await rest("GET", `/owner_payments?owner_id=eq.${owner.id}&select=amount`)).reduce((s, x) => s + num(x.amount), 0);
  check("Hak pemilik = akrual - bayar", acc === 820000 && (acc - pay) === 720000, `akrual=${acc} sisa=${acc - pay}`);

  // Hapus nota -> sisa titipan balik
  await rest("DELETE", `/sales?id=eq.${sale.id}`);
  const c1b = await rest("GET", `/consignments?id=eq.${con1.id}&select=qty_remaining`);
  check("Hapus nota mengembalikan sisa titipan", num(c1b[0].qty_remaining) === 100, `c1=${c1b[0].qty_remaining}`);

  // Cleanup
  await rest("DELETE", `/owner_payments?owner_id=eq.${owner.id}`);
  await rest("DELETE", `/consignments?id=eq.${con1.id}`);
  await rest("DELETE", `/consignments?id=eq.${con2.id}`);
  await rest("DELETE", `/products?id=eq.${prod.id}`);
  await rest("DELETE", `/contacts?id=eq.${owner.id}`);
  await rest("DELETE", `/contacts?id=eq.${cust.id}`);
  await rest("PATCH", "/document_counters?doc_type=eq.sale", { body: { next_no: 1 } });
  check("Cleanup selesai", true);
}
main().then(() => {
  const pass = results.filter(Boolean).length;
  console.log(`\n===== ${pass}/${results.length} lulus =====`);
  process.exit(pass === results.length ? 0 : 1);
}).catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
