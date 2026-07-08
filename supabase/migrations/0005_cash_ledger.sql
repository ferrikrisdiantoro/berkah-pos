-- ============================================================================
-- Berkah POS — Fase 2 Modul B: Buku Kas (cash ledger)
-- ----------------------------------------------------------------------------
-- Kas masuk/keluar. Otomatis dari pembayaran penjualan (masuk), pembayaran
-- pembelian (keluar), dan pembayaran hak pemilik (keluar). Plus entri manual.
-- ============================================================================

create table if not exists cash_ledger (
  id          uuid primary key default gen_random_uuid(),
  entry_date  date not null default current_date,
  direction   text not null check (direction in ('in','out')),
  category    text not null,
  description text,
  amount      numeric(14,2) not null check (amount > 0),
  ref_type    text,   -- 'sale_payment' | 'purchase_payment' | 'owner_payment' | 'manual'
  ref_id      uuid,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_cash_ledger_date on cash_ledger (entry_date);
create index if not exists idx_cash_ledger_ref on cash_ledger (ref_id);

-- ---------------------------------------------------------------------------
-- Auto-post dari payments (penjualan=masuk, pembelian=keluar)
-- ---------------------------------------------------------------------------
create or replace function trg_cashledger_payment()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
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
  elsif tg_op = 'DELETE' then
    delete from cash_ledger where ref_id = old.id and ref_type in ('sale_payment','purchase_payment');
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_payments_cashledger on payments;
create trigger trg_payments_cashledger
  after insert or delete on payments
  for each row execute function trg_cashledger_payment();

-- ---------------------------------------------------------------------------
-- Auto-post dari owner_payments (keluar)
-- ---------------------------------------------------------------------------
create or replace function trg_cashledger_owner()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    insert into cash_ledger (entry_date, direction, category, description, amount, ref_type, ref_id, created_by)
    values (new.date, 'out', 'Bayar Pemilik', 'Pembayaran hak pemilik', new.amount, 'owner_payment', new.id, new.created_by);
  elsif tg_op = 'DELETE' then
    delete from cash_ledger where ref_id = old.id and ref_type = 'owner_payment';
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_owner_payments_cashledger on owner_payments;
create trigger trg_owner_payments_cashledger
  after insert or delete on owner_payments
  for each row execute function trg_cashledger_owner();

-- ---------------------------------------------------------------------------
-- Backfill dari data lama
-- ---------------------------------------------------------------------------
insert into cash_ledger (entry_date, direction, category, description, amount, ref_type, ref_id, created_by)
select p.date,
       case when p.kind = 'sale' then 'in' else 'out' end,
       case when p.kind = 'sale' then 'Penjualan' else 'Pembelian' end,
       'Pembayaran ' || (case when p.kind = 'sale' then 'penjualan' else 'pembelian' end),
       p.amount,
       case when p.kind = 'sale' then 'sale_payment' else 'purchase_payment' end,
       p.id, p.created_by
from payments p
where not exists (select 1 from cash_ledger cl where cl.ref_id = p.id);

insert into cash_ledger (entry_date, direction, category, description, amount, ref_type, ref_id, created_by)
select o.date, 'out', 'Bayar Pemilik', 'Pembayaran hak pemilik', o.amount, 'owner_payment', o.id, o.created_by
from owner_payments o
where not exists (select 1 from cash_ledger cl where cl.ref_id = o.id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table cash_ledger enable row level security;
drop policy if exists cash_ledger_auth_all on cash_ledger;
create policy cash_ledger_auth_all on cash_ledger for all to authenticated using (true) with check (true);
