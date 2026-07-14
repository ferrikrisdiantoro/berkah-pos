-- ============================================================================
-- Revisi Bandeng
--  R4: Lengkapi data kontak (kategori + catatan)
--  R3: Alokasi pembayaran per item penjualan (pilih item mana yang dibayar)
-- ============================================================================

-- R4 --------------------------------------------------------------------
alter table contacts add column if not exists category text;   -- nelayan/petani/pemilik_barang/supplier/pelanggan/lainnya
alter table contacts add column if not exists notes text;

-- R3 --------------------------------------------------------------------
create table if not exists payment_allocations (
  id           uuid primary key default gen_random_uuid(),
  payment_id   uuid not null references payments(id) on delete cascade,
  sale_item_id uuid not null references sale_items(id) on delete cascade,
  amount       numeric(14,2) not null check (amount > 0),
  created_at   timestamptz not null default now()
);
create index if not exists idx_payalloc_payment on payment_allocations (payment_id);
create index if not exists idx_payalloc_item on payment_allocations (sale_item_id);

alter table payment_allocations enable row level security;
drop policy if exists payment_allocations_auth_all on payment_allocations;
create policy payment_allocations_auth_all on payment_allocations
  for all to authenticated using (true) with check (true);
