// Membuat user staff via Supabase Admin REST API (butuh service_role key).
// Pakai fetch langsung agar kompatibel Node 20 (tanpa init realtime supabase-js).
// SUPABASE_URL=... SERVICE_KEY=... EMAIL=... PASSWORD=... node scripts/create-user.mjs
const url = process.env.SUPABASE_URL;
const key = process.env.SERVICE_KEY;
const email = process.env.EMAIL;
const password = process.env.PASSWORD;

if (!url || !key || !email || !password) {
  console.error("SUPABASE_URL, SERVICE_KEY, EMAIL, PASSWORD wajib di-set.");
  process.exit(1);
}

const res = await fetch(`${url}/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Admin Berkah Mina" },
  }),
});

const body = await res.json();
if (!res.ok) {
  console.error("GAGAL:", res.status, JSON.stringify(body));
  process.exit(1);
}
console.log("User dibuat:", body.email ?? email, "(id:", (body.id ?? "?") + ")");
