-- Tunggakan manual per nota penjualan. Jika diisi (tidak null), angka ini yang
-- dipakai sebagai "Tunggakan Nota Lain" / "Total Hutang" di nota, menggantikan
-- hitungan otomatis dari nota lain. Null = pakai hitungan otomatis.
alter table sales add column if not exists manual_previous_debt numeric;
