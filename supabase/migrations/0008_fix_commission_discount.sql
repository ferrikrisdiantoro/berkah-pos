-- ============================================================================
-- FIX: dasar perhitungan komisi harus memakai nilai SETELAH DISKON
-- ----------------------------------------------------------------------------
-- Bug: komisi & hak pemilik dihitung dari (qty * unit_price) tanpa diskon,
-- sedangkan yang ditagih ke pelanggan = line_total (setelah diskon).
-- Akibat: komisi + hak_pemilik > yang ditagih -> toko rugi selisihnya.
--   contoh: qty 2 x 100.000 diskon 50% -> ditagih 100.000,
--           tapi komisi 20.000 + hak 180.000 = 200.000  (rugi 100.000)
-- Sesudah fix: dasar = 100.000 -> komisi 10.000 + hak 90.000 = 100.000 (pas).
-- ============================================================================

create or replace function trg_sale_item_commission()
returns trigger language plpgsql as $$
declare
  v_con  consignments%rowtype;
  v_sub  numeric(14,2);
begin
  if new.consignment_id is not null then
    select * into v_con from consignments where id = new.consignment_id;
    if v_con.id is null then
      raise exception 'Data titipan tidak ditemukan';
    end if;
    new.owner_id := v_con.owner_id;

    -- Nilai yang benar-benar ditagih (setelah diskon), sama dgn dasar subtotal.
    v_sub := round(new.qty * new.unit_price * (1 - coalesce(new.discount_pct, 0) / 100), 2);

    if v_con.commission_type = 'percent' then
      new.commission_amount := round(v_sub * v_con.commission_value / 100, 2);
    else
      new.commission_amount := round(v_con.commission_value * new.qty, 2);
    end if;
    -- Komisi tak boleh melebihi nilai tagihan.
    if new.commission_amount > v_sub then new.commission_amount := v_sub; end if;
    if new.commission_amount < 0 then new.commission_amount := 0; end if;

    new.owner_amount := v_sub - new.commission_amount;
  else
    new.owner_id := null;
    new.commission_amount := 0;
    new.owner_amount := 0;
  end if;
  return new;
end;
$$;

-- Hitung ulang baris titipan yang sudah ada agar konsisten (trigger BEFORE UPDATE
-- akan mengisi ulang commission_amount & owner_amount).
update sale_items set qty = qty where consignment_id is not null;
