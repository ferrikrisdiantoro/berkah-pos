-- Bukti transfer (foto) per pembayaran — data URI hasil resize di browser,
-- pola sama dengan business_settings.logo_url. Tampil di riwayat pembayaran
-- dan di Rekap Vendor (PDF) seperti contoh ledger manual Mas Hamdan.
alter table payments add column if not exists proof_url text;
