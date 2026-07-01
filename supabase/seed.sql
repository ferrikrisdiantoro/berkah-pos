-- ============================================================================
-- Berkah POS — Seed data awal (opsional, untuk demo)
-- Jalankan setelah migrasi. Idempoten pada bagian yang memungkinkan.
-- ============================================================================

-- Data usaha
update business_settings set
  name = 'UD. Berkah Mina',
  address = 'Jln. Pantai Depok KM 2.5 Parangtritis Kretek Bantul Yogyakarta',
  phone = '085729900321',
  footer_note = 'Terimakasih atas kepercayaan Anda.'
where id = 1;

-- Satuan
insert into units (name) values ('Kg'), ('ekor'), ('ikat'), ('pcs')
on conflict (name) do nothing;

-- Rekening
insert into bank_accounts (name, account_number, holder)
select 'Rekening BRI', '1234-5678-9012', 'UD. Berkah Mina'
where not exists (select 1 from bank_accounts where name = 'Rekening BRI');

-- Supplier contoh
insert into contacts (type, name, city)
select 'supplier', 'Nila', 'Semarang'
where not exists (select 1 from contacts where name = 'Nila' and city = 'Semarang');

-- Produk contoh (harga mengacu pada nota referensi)
insert into products (name, unit_id, buy_price, sell_price, stock)
select v.name, (select id from units where name = 'Kg'), v.buy, v.sell, 0
from (values
  ('Nila',      21000, 25000),
  ('Barakuda',  34000, 40000),
  ('Keong',     15000, 20000),
  ('Bandeng',   32000, 38000),
  ('Kutuk',     30000, 36000),
  ('Cumi',      35000, 42000),
  ('Berik',     32000, 38000),
  ('Krg. Ijo',  13000, 18000)
) as v(name, buy, sell)
where not exists (select 1 from products p where p.name = v.name);
