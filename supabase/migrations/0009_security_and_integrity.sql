-- ============================================================================
-- Perbaikan keamanan & integritas data (hasil audit menyeluruh)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) CRITICAL: staf bisa mengangkat dirinya jadi Master lewat PostgREST.
--    profiles kini HANYA BOLEH DIBACA oleh user login. Semua perubahan
--    (role/is_active/nama) lewat service role di lib/actions/users.ts.
--    Trigger handle_new_user tetap jalan karena SECURITY DEFINER.
-- ---------------------------------------------------------------------------
drop policy if exists profiles_auth_all on profiles;
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 2) CRITICAL: menghapus titipan yang barangnya SUDAH TERJUAL membuat
--    sale_items.consignment_id di-NULL-kan -> trigger stok salah mengurangi
--    stok produk, dan hak pemilik hilang. Sekarang dilarang (RESTRICT).
-- ---------------------------------------------------------------------------
alter table sale_items drop constraint if exists sale_items_consignment_id_fkey;
alter table sale_items
  add constraint sale_items_consignment_id_fkey
  foreign key (consignment_id) references consignments(id) on delete restrict;

-- Jaring pengaman: baris titipan tidak boleh menyentuh stok produk sama sekali.
create or replace function trg_stock_sale_items()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.consignment_id is not null then
      perform adjust_consignment(new.consignment_id, -new.qty);
    else
      perform apply_stock_delta(new.product_id, -new.qty);
    end if;

  elsif tg_op = 'DELETE' then
    if old.consignment_id is not null then
      perform adjust_consignment(old.consignment_id, old.qty);
    else
      perform apply_stock_delta(old.product_id, old.qty);
    end if;

  elsif tg_op = 'UPDATE' then
    -- Kembalikan efek baris lama
    if old.consignment_id is not null then
      perform adjust_consignment(old.consignment_id, old.qty);
    else
      perform apply_stock_delta(old.product_id, old.qty);
    end if;
    -- Terapkan efek baris baru
    if new.consignment_id is not null then
      perform adjust_consignment(new.consignment_id, -new.qty);
    elsif old.consignment_id is null then
      -- hanya kurangi stok produk bila baris ini memang bukan baris titipan
      perform apply_stock_delta(new.product_id, -new.qty);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Sisa titipan tidak boleh minus (cegah jual melebihi titipan).
-- ---------------------------------------------------------------------------
create or replace function adjust_consignment(p_id uuid, p_delta numeric)
returns void language plpgsql as $$
declare v_new numeric; v_name text;
begin
  update consignments
     set qty_remaining = qty_remaining + p_delta,
         status = case when (qty_remaining + p_delta) <= 0 then 'closed' else 'open' end
   where id = p_id
   returning qty_remaining, product_name into v_new, v_name;

  if v_new is null then
    raise exception 'Data titipan tidak ditemukan';
  end if;
  if v_new < 0 then
    raise exception 'Sisa titipan "%" tidak cukup (kurang % satuan)', v_name, abs(v_new);
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'consignments_remaining_ck') then
    alter table consignments
      add constraint consignments_remaining_ck check (qty_remaining >= 0);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Buku kas ikut berubah saat pembayaran DIUBAH (dulu hanya insert/delete).
-- ---------------------------------------------------------------------------
create or replace function trg_cashledger_payment()
returns trigger language plpgsql as $$
begin
  if tg_op in ('DELETE', 'UPDATE') then
    delete from cash_ledger
     where ref_id = old.id and ref_type in ('sale_payment', 'purchase_payment');
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    insert into cash_ledger (entry_date, direction, category, description, amount, ref_type, ref_id, created_by)
    values (
      new.date,
      case when new.kind = 'sale' then 'in' else 'out' end,
      case when new.kind = 'sale' then 'Penjualan' else 'Pembelian' end,
      'Pembayaran ' || (case when new.kind = 'sale' then 'penjualan' else 'pembelian' end),
      new.amount,
      case when new.kind = 'sale' then 'sale_payment' else 'purchase_payment' end,
      new.id, new.created_by
    );
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_payments_cashledger on payments;
create trigger trg_payments_cashledger
  after insert or update or delete on payments
  for each row execute function trg_cashledger_payment();

create or replace function trg_cashledger_owner()
returns trigger language plpgsql as $$
begin
  if tg_op in ('DELETE', 'UPDATE') then
    delete from cash_ledger where ref_id = old.id and ref_type = 'owner_payment';
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    insert into cash_ledger (entry_date, direction, category, description, amount, ref_type, ref_id, created_by)
    values (new.date, 'out', 'Bayar Pemilik', 'Pembayaran hak pemilik', new.amount, 'owner_payment', new.id, new.created_by);
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_owner_payments_cashledger on owner_payments;
create trigger trg_owner_payments_cashledger
  after insert or update or delete on owner_payments
  for each row execute function trg_cashledger_owner();

-- ---------------------------------------------------------------------------
-- 5) Alokasi pembayaran per item tidak boleh melebihi nilai baris / pembayaran.
-- ---------------------------------------------------------------------------
create or replace function trg_payalloc_guard()
returns trigger language plpgsql as $$
declare v_amt numeric; v_alloc numeric; v_line numeric; v_used numeric;
begin
  select amount into v_amt from payments
   where id = coalesce(new.payment_id, old.payment_id) for update;
  select coalesce(sum(amount), 0) into v_alloc from payment_allocations
   where payment_id = coalesce(new.payment_id, old.payment_id);
  if v_amt is not null and v_alloc > v_amt then
    raise exception 'Alokasi (%) melebihi nominal pembayaran (%)', v_alloc, v_amt;
  end if;

  select line_total into v_line from sale_items
   where id = coalesce(new.sale_item_id, old.sale_item_id) for update;
  select coalesce(sum(amount), 0) into v_used from payment_allocations
   where sale_item_id = coalesce(new.sale_item_id, old.sale_item_id);
  if v_line is not null and v_used > v_line then
    raise exception 'Alokasi item (%) melebihi total baris (%)', v_used, v_line;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_payalloc_guard on payment_allocations;
create constraint trigger trg_payalloc_guard
  after insert or update on payment_allocations
  deferrable initially deferred
  for each row execute function trg_payalloc_guard();

-- ---------------------------------------------------------------------------
-- 6) Nomor dokumen: cegah staf mengacak counter (fungsi jadi SECURITY DEFINER,
--    akses langsung ke tabel ditutup).
-- ---------------------------------------------------------------------------
create or replace function next_doc_number(p_doc_type text)
returns text language plpgsql security definer set search_path = public as $$
declare v_prefix text; v_no bigint;
begin
  update document_counters
     set next_no = next_no + 1
   where doc_type = p_doc_type
   returning prefix, next_no - 1 into v_prefix, v_no;
  if v_prefix is null then
    raise exception 'Unknown doc_type: %', p_doc_type;
  end if;
  return v_prefix || '/' || lpad(v_no::text, 5, '0');
end;
$$;
grant execute on function next_doc_number(text) to authenticated;
drop policy if exists document_counters_auth_all on document_counters;

-- ---------------------------------------------------------------------------
-- 7) Nota harus "masuk akal": Sub Total (kotor) - Diskon + Pajak = Total.
--    Dulu subtotal sudah bersih diskon, sehingga nota tercetak tidak nyambung.
-- ---------------------------------------------------------------------------
create or replace function recalc_purchase(p_id uuid)
returns void language plpgsql as $$
declare v_gross numeric(14,2); v_total numeric(14,2); v_discount numeric(14,2);
        v_paid numeric(14,2); v_status text;
begin
  select coalesce(sum(round(qty * unit_price, 2)), 0),
         coalesce(sum(line_total), 0),
         coalesce(sum(round(qty * unit_price * coalesce(discount_pct,0)/100, 2)), 0)
    into v_gross, v_total, v_discount
    from purchase_items where purchase_id = p_id;

  select coalesce(sum(amount), 0) into v_paid from payments where purchase_id = p_id;
  select status into v_status from purchases where id = p_id;
  if v_status is distinct from 'draft' then
    v_status := case when v_total > 0 and v_paid >= v_total then 'paid'
                     when v_paid > 0 then 'partial' else 'unpaid' end;
  end if;

  update purchases set
    subtotal = v_gross,
    discount_total = v_discount,
    tax_total = v_total - (v_gross - v_discount),
    total = v_total,
    paid_total = v_paid,
    status = v_status
  where id = p_id;
end;
$$;

create or replace function recalc_sale(p_id uuid)
returns void language plpgsql as $$
declare v_gross numeric(14,2); v_total numeric(14,2); v_discount numeric(14,2);
        v_paid numeric(14,2); v_status text;
begin
  select coalesce(sum(round(qty * unit_price, 2)), 0),
         coalesce(sum(line_total), 0),
         coalesce(sum(round(qty * unit_price * coalesce(discount_pct,0)/100, 2)), 0)
    into v_gross, v_total, v_discount
    from sale_items where sale_id = p_id;

  select coalesce(sum(amount), 0) into v_paid from payments where sale_id = p_id;
  select status into v_status from sales where id = p_id;
  if v_status is distinct from 'draft' then
    v_status := case when v_total > 0 and v_paid >= v_total then 'paid'
                     when v_paid > 0 then 'partial' else 'unpaid' end;
  end if;

  update sales set
    subtotal = v_gross,
    discount_total = v_discount,
    tax_total = v_total - (v_gross - v_discount),
    total = v_total,
    paid_total = v_paid,
    status = v_status
  where id = p_id;
end;
$$;

-- Hitung ulang semua nota agar konsisten dengan rumus baru.
do $$
declare r record;
begin
  for r in select id from purchases loop perform recalc_purchase(r.id); end loop;
  for r in select id from sales loop perform recalc_sale(r.id); end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 8) Index untuk halaman yang sering dibuka.
-- ---------------------------------------------------------------------------
create index if not exists idx_sale_items_consignment on sale_items (consignment_id) where consignment_id is not null;
create index if not exists idx_sale_items_owner on sale_items (owner_id) where owner_id is not null;
create index if not exists idx_sales_date on sales (date);
create index if not exists idx_purchases_date on purchases (date);
drop index if exists idx_cash_ledger_ref;
create index if not exists idx_cash_ledger_ref on cash_ledger (ref_type, ref_id);
