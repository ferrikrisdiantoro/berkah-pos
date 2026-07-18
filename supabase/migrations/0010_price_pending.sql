-- ============================================================================
-- Fitur "harga menyusul": barang keluar dulu, harga diisi belakangan.
-- Item ber-price_pending=true tidak dihitung ke total/komisi/hak pemilik
-- (unit_price 0 -> line_total 0 -> komisi 0), tapi stok/sisa titipan tetap
-- berkurang karena barangnya memang sudah keluar.
-- ============================================================================

alter table sale_items add column if not exists price_pending boolean not null default false;
alter table purchase_items add column if not exists price_pending boolean not null default false;

-- Item menunggu harga wajib berharga 0 (biar tak ikut hitungan sampai diisi).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sale_items_pending_price_ck') then
    alter table sale_items add constraint sale_items_pending_price_ck
      check (not price_pending or unit_price = 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'purchase_items_pending_price_ck') then
    alter table purchase_items add constraint purchase_items_pending_price_ck
      check (not price_pending or unit_price = 0);
  end if;
end $$;
