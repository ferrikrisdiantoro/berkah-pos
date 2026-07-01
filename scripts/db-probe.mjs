// Mencari host pooler Supabase yang benar untuk sebuah project ref.
import pg from "pg";

const ref = process.env.REF;
const pass = process.env.PASS;
const regions = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "ap-southeast-1", "ap-southeast-2", "ap-south-1",
  "ap-northeast-1", "ap-northeast-2",
  "eu-west-1", "eu-west-2", "eu-central-1", "eu-central-2",
  "ca-central-1", "sa-east-1",
];
const prefixes = ["aws-0", "aws-1"];

for (const region of regions) {
  for (const prefix of prefixes) {
    const host = `${prefix}-${region}.pooler.supabase.com`;
    const client = new pg.Client({
      host,
      port: 6543,
      user: `postgres.${ref}`,
      password: pass,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 6000,
    });
    try {
      await client.connect();
      await client.query("select 1");
      console.log(`FOUND: ${host}`);
      await client.end();
      process.exit(0);
    } catch (e) {
      const msg = String(e.message || e);
      if (!/not found|ENOTFOUND|timeout|ETIMEDOUT/i.test(msg)) {
        // Error selain "tenant tidak ada" berarti host benar tapi masalah lain.
        console.log(`MAYBE ${host}: ${msg}`);
      }
      try { await client.end(); } catch {}
    }
  }
}
console.log("Tidak ada region yang cocok dari daftar.");
process.exit(1);
