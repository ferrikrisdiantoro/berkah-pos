// Menjalankan file SQL ke Postgres Supabase.
// Pakai:  DATABASE_URL="postgresql://..." node scripts/db-migrate.mjs file1.sql file2.sql ...
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL belum di-set.");
  process.exit(1);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Tidak ada file SQL yang diberikan.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  for (const f of files) {
    const sql = readFileSync(f, "utf8");
    process.stdout.write(`→ ${f} ... `);
    await client.query(sql);
    console.log("OK");
  }
  console.log("\nSemua migrasi berhasil.");
} catch (err) {
  console.error("\nGAGAL:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
