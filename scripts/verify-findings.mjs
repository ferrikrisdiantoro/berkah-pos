// Verifikasi temuan audit (skeptis): benar-benar bisa direproduksi atau tidak?
// CATATAN: JANGAN reset document_counters — nomor nota dipakai data asli;
// meresetnya membuat nota berikutnya bentrok & gagal disimpan.
const URL = process.env.SUPABASE_URL, ANON = process.env.ANON, SVC = process.env.SVC;
const EMAIL = process.env.EMAIL, PASSWORD = process.env.PASSWORD;
const out = [];
const say = (n, real, d = "") => { out.push({ n, real }); console.log(`${real ? "🔴 TERBUKTI" : "🟢 TIDAK terbukti"}  ${n}${d ? `\n     ${d}` : ""}`); };

async function rest(method, path, { body, prefer, token } = {}) {
  const res = await fetch(`${URL}/rest/v1${path}`, {
    method,
    headers: { apikey: ANON, Authorization: `Bearer ${token ?? SVC}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const t = await res.text(); let d; try { d = t ? JSON.parse(t) : null; } catch { d = t; }
  return { ok: res.ok, status: res.status, data: d };
}
const REP = "return=representation";
const ts = Date.now();

async function main() {
  // ---------- TEMUAN #1: staff bisa naikkan dirinya jadi owner? ----------
  const email = `_zstaff${ts}@test.local`;
  const created = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "StaffTest123", email_confirm: true }),
  }).then((r) => r.json());
  const staffId = created.id;

  const staffToken = (await (await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "StaffTest123" }),
  })).json()).access_token;

  const before = (await rest("GET", `/profiles?id=eq.${staffId}&select=role`)).data?.[0]?.role;
  // Staff mencoba mengangkat dirinya sendiri jadi owner pakai TOKEN-nya sendiri
  await rest("PATCH", `/profiles?id=eq.${staffId}`, { body: { role: "owner" }, token: staffToken });
  const after = (await rest("GET", `/profiles?id=eq.${staffId}&select=role`)).data?.[0]?.role;
  say("#1 Staff bisa mengangkat diri jadi Master (owner)", before !== "owner" && after === "owner",
    `role sebelum=${before} -> sesudah=${after}`);

  // ---------- TEMUAN #2: hapus titipan -> stok produk ikut berkurang? ----------
  const [own] = (await rest("POST", "/contacts", { prefer: REP, body: { type: "supplier", name: `_Z Own2 ${ts}` } })).data;
  const [cust] = (await rest("POST", "/contacts", { prefer: REP, body: { type: "customer", name: `_Z Cust2 ${ts}` } })).data;
  const [prod] = (await rest("POST", "/products", { prefer: REP, body: { name: `_Z Ikan2 ${ts}`, track_stock: true } })).data;
  await rest("POST", "/stock_movements", { body: { product_id: prod.id, qty: 100, ref_kind: "opening" } });
  const [con] = (await rest("POST", "/consignments", { prefer: REP, body: {
    owner_id: own.id, product_id: prod.id, product_name: "ZIkan2", qty_in: 50, qty_remaining: 50,
    commission_type: "percent", commission_value: 10 } })).data;

  const no = (await rest("POST", "/rpc/next_doc_number", { body: { p_doc_type: "sale" } })).data;
  const [sale] = (await rest("POST", "/sales", { prefer: REP, body: { number: no, contact_id: cust.id, status: "unpaid" } })).data;
  await rest("POST", "/sale_items", { body: [{ sale_id: sale.id, consignment_id: con.id, product_id: prod.id, description: "Z", qty: 10, unit_price: 20000, discount_pct: 0, tax_pct: 0, position: 0 }] });

  const stokSebelum = Number((await rest("GET", `/products?id=eq.${prod.id}&select=stock`)).data[0].stock);
  const hakSebelum = Number((await rest("GET", `/sale_items?sale_id=eq.${sale.id}&select=owner_amount`)).data[0].owner_amount);

  // Hapus titipan (tombol Hapus di /titipan)
  await rest("DELETE", `/consignments?id=eq.${con.id}`);

  const stokSesudah = Number((await rest("GET", `/products?id=eq.${prod.id}&select=stock`)).data[0].stock);
  const itemSesudah = (await rest("GET", `/sale_items?sale_id=eq.${sale.id}&select=owner_id,owner_amount`)).data[0];

  say("#2 Hapus titipan mengurangi stok produk (padahal titipan bukan stok toko)",
    stokSesudah !== stokSebelum, `stok ${stokSebelum} -> ${stokSesudah}`);
  say("#2b Hapus titipan menghapus hak pemilik yg sudah terjual",
    hakSebelum > 0 && Number(itemSesudah.owner_amount) === 0,
    `hak pemilik ${hakSebelum.toLocaleString("id-ID")} -> ${Number(itemSesudah.owner_amount).toLocaleString("id-ID")}`);

  // ---------- TEMUAN #6: sisa titipan bisa minus (oversell)? ----------
  const [con2] = (await rest("POST", "/consignments", { prefer: REP, body: {
    owner_id: own.id, product_name: "ZIkan3", qty_in: 5, qty_remaining: 5,
    commission_type: "percent", commission_value: 10 } })).data;
  const r = await rest("POST", "/sale_items", { body: [{ sale_id: sale.id, consignment_id: con2.id, description: "Z3", qty: 50, unit_price: 10000, discount_pct: 0, tax_pct: 0, position: 1 }] });
  const sisa = r.ok ? Number((await rest("GET", `/consignments?id=eq.${con2.id}&select=qty_remaining`)).data[0].qty_remaining) : null;
  say("#6 Jual melebihi sisa titipan -> sisa jadi MINUS (tak ditolak)", r.ok && sisa !== null && sisa < 0,
    `jual 50 dari sisa 5 -> sisa=${sisa}`);

  // ---------- Bersih-bersih ----------
  await rest("DELETE", `/sales?id=eq.${sale.id}`);
  await rest("DELETE", `/consignments?id=eq.${con2.id}`);
  await rest("DELETE", `/products?id=eq.${prod.id}`);
  await rest("DELETE", `/contacts?id=eq.${own.id}`);
  await rest("DELETE", `/contacts?id=eq.${cust.id}`);
  await fetch(`${URL}/auth/v1/admin/users/${staffId}`, {
    method: "DELETE", headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
  });
  console.log("\n(data uji dibersihkan)");
  console.log(`\n===== ${out.filter((x) => x.real).length}/${out.length} temuan TERBUKTI nyata =====`);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
