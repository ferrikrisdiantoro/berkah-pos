-- ============================================================================
-- Berkah POS — Perbaikan: ledger stok (opening/adjustment) + guard diskon
-- ----------------------------------------------------------------------------
-- Model stok:
--   * Pembelian/penjualan  -> stok digerakkan trigger item (sudah ada di 0002).
--   * Opening & adjustment -> lewat tabel stock_movements (trigger di file ini).
--   Keduanya tidak dobel karena trigger stock_movements HANYA memproses
--   ref_kind 'opening' & 'adjustment'.
-- ============================================================================

create or replace function trg_stock_movement_apply()
returns trigger language plpgsql as $$
begin
  -- purchase/sale sudah ditangani trigger pada purchase_items/sale_items.
  if tg_op = 'INSERT' then
    if new.ref_kind in ('opening', 'adjustment') then
      perform apply_stock_delta(new.product_id, new.qty);
    end if;
  elsif tg_op = 'DELETE' then
    if old.ref_kind in ('opening', 'adjustment') then
      perform apply_stock_delta(old.product_id, -old.qty);
    end if;
  elsif tg_op = 'UPDATE' then
    if old.ref_kind in ('opening', 'adjustment') then
      perform apply_stock_delta(old.product_id, -old.qty);
    end if;
    if new.ref_kind in ('opening', 'adjustment') then
      perform apply_stock_delta(new.product_id, new.qty);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_stock_movements_apply on stock_movements;
create trigger trg_stock_movements_apply
  after insert or update or delete on stock_movements
  for each row execute function trg_stock_movement_apply();

-- ----------------------------------------------------------------------------
-- Penyesuaian stok (opname): set stok aktual, catat selisih sebagai adjustment.
-- ----------------------------------------------------------------------------
create or replace function adjust_stock(p_product uuid, p_actual numeric, p_note text default null)
returns void language plpgsql as $$
declare
  v_current numeric;
  v_delta   numeric;
  v_track   boolean;
begin
  select stock, track_stock into v_current, v_track from products where id = p_product;
  if v_current is null then
    raise exception 'Produk tidak ditemukan';
  end if;
  if not v_track then
    raise exception 'Produk ini tidak mengelola stok';
  end if;
  v_delta := p_actual - v_current;
  if v_delta = 0 then return; end if;
  insert into stock_movements (product_id, qty, ref_kind, note)
  values (p_product, v_delta, 'adjustment', coalesce(p_note, 'Penyesuaian stok'));
end;
$$;
grant execute on function adjust_stock(uuid, numeric, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Guard diskon 0..100 (cegah total negatif). Data lama diskon=0 aman.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'purchase_items_discount_ck') then
    alter table purchase_items add constraint purchase_items_discount_ck
      check (discount_pct >= 0 and discount_pct <= 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sale_items_discount_ck') then
    alter table sale_items add constraint sale_items_discount_ck
      check (discount_pct >= 0 and discount_pct <= 100);
  end if;
end $$;
