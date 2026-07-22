-- "Susut" (selisih timbangan kita vs qty di nota vendor) per item pembelian.
-- vendor_qty = qty yang tertulis di nota supplier (opsional, admin isi kalau ada
-- selisih dengan hasil timbang sendiri). susut = qty timbang - vendor_qty
-- (negatif = hasil timbang kita lebih sedikit dari klaim vendor).

alter table purchase_items add column if not exists vendor_qty numeric(14,3);

alter table purchase_items add column if not exists susut numeric(14,3)
  generated always as (
    case when vendor_qty is null then null else round(qty - vendor_qty, 3) end
  ) stored;
