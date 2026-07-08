-- ============================================================================
-- Berkah POS — Fase 2 Modul A: Konsinyasi (titip jual) & Komisi
-- ----------------------------------------------------------------------------
-- Pemilik barang menitipkan produk ke toko. Toko menjual; dari tiap penjualan
-- barang titipan: toko dapat KOMISI, sisanya HAK PEMILIK. Toko lalu membayar
-- hak pemilik. Rumus (mengikuti referensi):
--   komisi = (type 'percent'? subtotal*value/100 : value*qty), maks = subtotal
--   hak_pemilik = subtotal - komisi
-- ============================================================================

create table if not exists consignments (
  id               uuid primary key default gen_random_uuid(),
  received_date    date not null default current_date,
  owner_id         uuid not null references contacts(id) on delete restrict,
  product_id       uuid references products(id) on delete set null,
  product_name     text not null,                 -- snapshot nama produk titipan
  unit             text,
  qty_in           numeric(14,3) not null default 0,
  qty_remaining    numeric(14,3) not null default 0,
  base_price       numeric(14,2) not null default 0,  -- harga titip (acuan)
  commission_type  text not null default 'percent' check (commission_type in ('percent','fixed_per_unit')),
  commission_value numeric(14,2) not null default 0,
  status           text not null default 'open' check (status in ('open','closed')),
  notes            text,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists idx_consignments_owner on consignments (owner_id);
create index if not exists idx_consignments_status on consignments (status);

-- Kolom konsinyasi pada item penjualan
alter table sale_items add column if not exists consignment_id uuid references consignments(id) on delete set null;
alter table sale_items add column if not exists owner_id uuid references contacts(id) on delete set null;
alter table sale_items add column if not exists commission_amount numeric(14,2) not null default 0;
alter table sale_items add column if not exists owner_amount numeric(14,2) not null default 0;

-- Pembayaran hak pemilik barang
create table if not exists owner_payments (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references contacts(id) on delete cascade,
  date        date not null default current_date,
  amount      numeric(14,2) not null check (amount > 0),
  notes       text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_owner_payments_owner on owner_payments (owner_id);

-- ---------------------------------------------------------------------------
-- Hitung komisi & hak pemilik SEBELUM simpan baris (BEFORE INSERT/UPDATE)
-- ---------------------------------------------------------------------------
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
    v_sub := round(new.qty * new.unit_price, 2);
    if v_con.commission_type = 'percent' then
      new.commission_amount := round(v_sub * v_con.commission_value / 100, 2);
    else
      new.commission_amount := round(v_con.commission_value * new.qty, 2);
    end if;
    if new.commission_amount > v_sub then new.commission_amount := v_sub; end if;
    new.owner_amount := v_sub - new.commission_amount;
  else
    new.owner_id := null;
    new.commission_amount := 0;
    new.owner_amount := 0;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_sale_items_commission on sale_items;
create trigger trg_sale_items_commission
  before insert or update on sale_items
  for each row execute function trg_sale_item_commission();

-- ---------------------------------------------------------------------------
-- Sesuaikan sisa titipan
-- ---------------------------------------------------------------------------
create or replace function adjust_consignment(p_id uuid, p_delta numeric)
returns void language plpgsql as $$
begin
  update consignments
     set qty_remaining = qty_remaining + p_delta,
         status = case when (qty_remaining + p_delta) <= 0 then 'closed' else 'open' end
   where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ganti trigger stok item penjualan: baris titipan kurangi sisa titipan,
-- baris biasa kurangi stok produk (perilaku lama).
-- ---------------------------------------------------------------------------
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
    if old.consignment_id is not null then
      perform adjust_consignment(old.consignment_id, old.qty);
    else
      perform apply_stock_delta(old.product_id, old.qty);
    end if;
    if new.consignment_id is not null then
      perform adjust_consignment(new.consignment_id, -new.qty);
    else
      perform apply_stock_delta(new.product_id, -new.qty);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['consignments','owner_payments']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %I on %I;', t || '_auth_all', t);
    execute format(
      'create policy %I on %I for all to authenticated using (true) with check (true);',
      t || '_auth_all', t);
  end loop;
end $$;
