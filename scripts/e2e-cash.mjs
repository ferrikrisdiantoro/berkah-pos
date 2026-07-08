// Uji Modul B: buku kas auto-post dari pembayaran + owner payment + manual. Self-cleaning.
const URL = process.env.SUPABASE_URL, ANON = process.env.ANON;
const EMAIL = process.env.EMAIL, PASSWORD = process.env.PASSWORD;
const results = [];
const check = (n, ok, d = "") => { results.push(!!ok); console.log(`${ok ? "✓" : "✗"} ${n}${d ? `  (${d})` : ""}`); };
const num = (x) => Number(x);
let token = ANON;
async function rest(method, path, { body, prefer } = {}) {
  const res = await fetch(`${URL}/rest/v1${path}`, {
    method, headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const t = await res.text(); let d; try { d = t ? JSON.parse(t) : null; } catch { d = t; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${t}`);
  return d;
}
const REP = "return=representation", ts = Date.now();
const ledgerFor = async (refId) => rest("GET", `/cash_ledger?ref_id=eq.${refId}&select=direction,amount,category`);

async function main() {
  token = (await (await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })).json()).access_token;
  check("Login", !!token);

  const [sup] = await rest("POST", "/contacts", { prefer: REP, body: { type: "supplier", name: `_C Sup ${ts}` } });
  const [cust] = await rest("POST", "/contacts", { prefer: REP, body: { type: "customer", name: `_C Cust ${ts}` } });

  // Pembelian + bayar -> kas KELUAR
  const pNo = await rest("POST", "/rpc/next_doc_number", { body: { p_doc_type: "purchase" } });
  const [pur] = await rest("POST", "/purchases", { prefer: REP, body: { number: pNo, contact_id: sup.id, status: "unpaid" } });
  const [ppay] = await rest("POST", "/payments", { prefer: REP, body: { kind: "purchase", purchase_id: pur.id, amount: 50000 } });
  let led = await ledgerFor(ppay.id);
  check("Bayar pembelian -> kas keluar", led.length === 1 && led[0].direction === "out" && num(led[0].amount) === 50000, JSON.stringify(led));

  // Penjualan + bayar -> kas MASUK
  const sNo = await rest("POST", "/rpc/next_doc_number", { body: { p_doc_type: "sale" } });
  const [sale] = await rest("POST", "/sales", { prefer: REP, body: { number: sNo, contact_id: cust.id, status: "unpaid" } });
  const [spay] = await rest("POST", "/payments", { prefer: REP, body: { kind: "sale", sale_id: sale.id, amount: 80000 } });
  led = await ledgerFor(spay.id);
  check("Bayar penjualan -> kas masuk", led.length === 1 && led[0].direction === "in" && num(led[0].amount) === 80000, JSON.stringify(led));

  // Bayar hak pemilik -> kas KELUAR
  const [opay] = await rest("POST", "/owner_payments", { prefer: REP, body: { owner_id: sup.id, amount: 30000 } });
  led = await ledgerFor(opay.id);
  check("Bayar pemilik -> kas keluar", led.length === 1 && led[0].direction === "out" && led[0].category === "Bayar Pemilik", JSON.stringify(led));

  // Hapus pembayaran penjualan -> entri kas ikut hilang
  await rest("DELETE", `/payments?id=eq.${spay.id}`);
  led = await ledgerFor(spay.id);
  check("Hapus pembayaran -> entri kas terhapus", led.length === 0);

  // Entri manual
  const [man] = await rest("POST", "/cash_ledger", { prefer: REP, body: { direction: "out", category: "Operasional", amount: 15000, ref_type: "manual" } });
  check("Entri kas manual tersimpan", !!man?.id);

  // Cleanup
  await rest("DELETE", `/cash_ledger?id=eq.${man.id}`);
  await rest("DELETE", `/owner_payments?id=eq.${opay.id}`);
  await rest("DELETE", `/purchases?id=eq.${pur.id}`);
  await rest("DELETE", `/sales?id=eq.${sale.id}`);
  await rest("DELETE", `/contacts?id=eq.${sup.id}`);
  await rest("DELETE", `/contacts?id=eq.${cust.id}`);
  await rest("PATCH", "/document_counters?doc_type=eq.purchase", { body: { next_no: 1 } });
  await rest("PATCH", "/document_counters?doc_type=eq.sale", { body: { next_no: 1 } });
  // pastikan entri auto milik pembelian sudah terhapus lewat cascade payment
  const leftover = await ledgerFor(ppay.id);
  check("Cleanup + entri auto ikut terhapus saat transaksi dihapus", leftover.length === 0);
}
main().then(() => {
  const pass = results.filter(Boolean).length;
  console.log(`\n===== ${pass}/${results.length} lulus =====`);
  process.exit(pass === results.length ? 0 : 1);
}).catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
