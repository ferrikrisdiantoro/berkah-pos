-- ============================================================================
-- Berkah POS — Skema inti
-- Single-tenant (satu usaha), multi-user staff. RLS: semua user login = akses penuh.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helper: trigger updated_at
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — mirror auth.users, menyimpan peran staff
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'staff' check (role in ('owner','staff')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Buat profile otomatis saat user baru daftar
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- business_settings — data usaha (singleton, id selalu = 1)
-- ---------------------------------------------------------------------------
create table if not exists business_settings (
  id           smallint primary key default 1 check (id = 1),
  name         text not null default 'UD. Berkah Mina',
  address      text,
  phone        text,
  email        text,
  logo_url     text,
  footer_note  text default 'Terimakasih atas kepercayaan Anda.',
  updated_at   timestamptz not null default now()
);
create trigger trg_business_updated before update on business_settings
  for each row execute function set_updated_at();
insert into business_settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- bank_accounts — rekening / kas untuk pembayaran
-- ---------------------------------------------------------------------------
create table if not exists bank_accounts (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,            -- mis. "Rekening BRI"
  account_number text,
  holder         text,
  is_cash        boolean not null default false,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- units & categories
-- ---------------------------------------------------------------------------
create table if not exists units (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,         -- Kg, pcs, ikat
  created_at timestamptz not null default now()
);

create table if not exists product_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  code         text unique,
  name         text not null,
  category_id  uuid references product_categories(id) on delete set null,
  unit_id      uuid references units(id) on delete set null,
  buy_price    numeric(14,2) not null default 0,
  sell_price   numeric(14,2) not null default 0,
  track_stock  boolean not null default true,
  stock        numeric(14,3) not null default 0,
  min_stock    numeric(14,3) not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();
create index if not exists idx_products_name on products (name);

-- ---------------------------------------------------------------------------
-- contacts — supplier / pelanggan
-- ---------------------------------------------------------------------------
create table if not exists contacts (
  id         uuid primary key default gen_random_uuid(),
  type       text not null default 'supplier' check (type in ('supplier','customer','both')),
  name       text not null,
  city       text,
  phone      text,
  email      text,
  address    text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_contacts_updated before update on contacts
  for each row execute function set_updated_at();
create index if not exists idx_contacts_name on contacts (name);

-- ---------------------------------------------------------------------------
-- Nomor dokumen (PI/xxxx, SI/xxxx) — counter aman-konkuren
-- ---------------------------------------------------------------------------
create table if not exists document_counters (
  doc_type text primary key,   -- 'purchase' | 'sale'
  prefix   text not null,
  next_no  bigint not null default 1
);
insert into document_counters (doc_type, prefix, next_no) values
  ('purchase', 'PI', 1),
  ('sale', 'SI', 1)
on conflict do nothing;

create or replace function next_doc_number(p_doc_type text)
returns text language plpgsql as $$
declare
  v_prefix text;
  v_no     bigint;
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

-- ---------------------------------------------------------------------------
-- purchases + sales (struktur identik) — dibuat lewat DO block untuk hindari duplikasi
-- ---------------------------------------------------------------------------
create table if not exists purchases (
  id            uuid primary key default gen_random_uuid(),
  number        text unique not null,
  contact_id    uuid references contacts(id) on delete restrict,
  date          date not null default current_date,
  due_date      date,
  status        text not null default 'unpaid' check (status in ('draft','unpaid','partial','paid')),
  subtotal      numeric(14,2) not null default 0,
  discount_total numeric(14,2) not null default 0,
  tax_total     numeric(14,2) not null default 0,
  total         numeric(14,2) not null default 0,
  paid_total    numeric(14,2) not null default 0,
  notes         text,
  share_token   uuid not null default gen_random_uuid(),
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_purchases_updated before update on purchases
  for each row execute function set_updated_at();
create index if not exists idx_purchases_contact on purchases (contact_id);
create index if not exists idx_purchases_share on purchases (share_token);

create table if not exists purchase_items (
  id            uuid primary key default gen_random_uuid(),
  purchase_id   uuid not null references purchases(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  description   text not null,             -- snapshot nama produk saat transaksi
  qty           numeric(14,3) not null default 0,
  unit_price    numeric(14,2) not null default 0,
  discount_pct  numeric(6,3) not null default 0,
  tax_pct       numeric(6,3) not null default 0,
  line_total    numeric(14,2) generated always as (
    round(qty * unit_price * (1 - coalesce(discount_pct,0)/100) * (1 + coalesce(tax_pct,0)/100), 2)
  ) stored,
  position      int not null default 0
);
create index if not exists idx_purchase_items_purchase on purchase_items (purchase_id);

create table if not exists sales (
  id            uuid primary key default gen_random_uuid(),
  number        text unique not null,
  contact_id    uuid references contacts(id) on delete restrict,
  date          date not null default current_date,
  due_date      date,
  status        text not null default 'unpaid' check (status in ('draft','unpaid','partial','paid')),
  subtotal      numeric(14,2) not null default 0,
  discount_total numeric(14,2) not null default 0,
  tax_total     numeric(14,2) not null default 0,
  total         numeric(14,2) not null default 0,
  paid_total    numeric(14,2) not null default 0,
  notes         text,
  share_token   uuid not null default gen_random_uuid(),
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_sales_updated before update on sales
  for each row execute function set_updated_at();
create index if not exists idx_sales_contact on sales (contact_id);
create index if not exists idx_sales_share on sales (share_token);

create table if not exists sale_items (
  id            uuid primary key default gen_random_uuid(),
  sale_id       uuid not null references sales(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  description   text not null,
  qty           numeric(14,3) not null default 0,
  unit_price    numeric(14,2) not null default 0,
  discount_pct  numeric(6,3) not null default 0,
  tax_pct       numeric(6,3) not null default 0,
  line_total    numeric(14,2) generated always as (
    round(qty * unit_price * (1 - coalesce(discount_pct,0)/100) * (1 + coalesce(tax_pct,0)/100), 2)
  ) stored,
  position      int not null default 0
);
create index if not exists idx_sale_items_sale on sale_items (sale_id);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('purchase','sale')),
  purchase_id uuid references purchases(id) on delete cascade,
  sale_id     uuid references sales(id) on delete cascade,
  account_id  uuid references bank_accounts(id) on delete set null,
  date        date not null default current_date,
  amount      numeric(14,2) not null check (amount > 0),
  method      text,
  notes       text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint payment_target_ck check (
    (kind = 'purchase' and purchase_id is not null and sale_id is null) or
    (kind = 'sale'     and sale_id is not null and purchase_id is null)
  )
);
create index if not exists idx_payments_purchase on payments (purchase_id);
create index if not exists idx_payments_sale on payments (sale_id);

-- ---------------------------------------------------------------------------
-- stock_movements — kartu stok (qty positif = masuk, negatif = keluar)
-- ---------------------------------------------------------------------------
create table if not exists stock_movements (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  date        date not null default current_date,
  qty         numeric(14,3) not null,
  ref_kind    text not null check (ref_kind in ('purchase','sale','adjustment','opening')),
  ref_id      uuid,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_stock_mov_product on stock_movements (product_id);
