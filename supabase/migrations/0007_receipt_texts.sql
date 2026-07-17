-- ============================================================================
-- Revisi #6: Teks nota bisa diatur sendiri lewat Pengaturan
--  - bank_info : nomor rekening / info bayar (tampil di atas "--- NAMA ---")
--  - thanks_note : ucapan terima kasih (baris pertama footer)
--  - receipt_title_sale / receipt_title_purchase : judul nota
--  - signature_note : teks tanda tangan/penutup
-- ============================================================================

alter table business_settings add column if not exists bank_info text;
alter table business_settings add column if not exists receipt_title_sale text default 'NOTA PENJUALAN';
alter table business_settings add column if not exists receipt_title_purchase text default 'NOTA PEMBELIAN';
alter table business_settings add column if not exists signature_note text;

-- Isi awal dari rekening aktif pertama (kalau ada) supaya langsung tampil.
update business_settings b
   set bank_info = coalesce(b.bank_info, (
     select trim(both ' ' from
       ba.name || coalesce(' ' || ba.account_number, '') || coalesce(' a.n. ' || ba.holder, ''))
     from bank_accounts ba
     where ba.is_active = true and coalesce(ba.is_cash, false) = false
     order by ba.created_at
     limit 1
   ))
 where b.id = 1;
