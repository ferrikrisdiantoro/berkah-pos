-- Saldo tunggakan lama (manual, di luar nota sistem) per kontak, plus riwayat
-- mutasinya. Menggantikan pola "ketik ulang setiap nota": sekali dicatat,
-- otomatis terbawa ke nota berikutnya; kalau dibayar sebagian, dicatat sebagai
-- pengurang dan sisanya otomatis ikut nota selanjutnya.

alter table contacts add column if not exists manual_debt_balance numeric not null default 0;

create table if not exists contact_debt_entries (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  date date not null default current_date,
  -- Positif = tambah tunggakan lama, negatif = pembayaran/pengurang.
  amount numeric not null,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_debt_entries_contact on contact_debt_entries(contact_id, date);

alter table contact_debt_entries enable row level security;
create policy contact_debt_entries_auth_all on contact_debt_entries
  for all to authenticated using (true) with check (true);

-- Insert entry + update saldo secara atomik (hindari race condition read-then-write).
create or replace function adjust_contact_debt(
  p_contact_id uuid,
  p_amount numeric,
  p_date date,
  p_note text,
  p_user uuid
)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into contact_debt_entries (contact_id, date, amount, note, created_by)
  values (p_contact_id, coalesce(p_date, current_date), p_amount, p_note, p_user);

  update contacts set manual_debt_balance = manual_debt_balance + p_amount
  where id = p_contact_id;
end;
$$;

-- Hapus entry + kembalikan efeknya ke saldo, secara atomik.
create or replace function delete_contact_debt_entry(p_entry_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_contact_id uuid; v_amount numeric;
begin
  select contact_id, amount into v_contact_id, v_amount
  from contact_debt_entries where id = p_entry_id;

  if v_contact_id is null then
    return;
  end if;

  delete from contact_debt_entries where id = p_entry_id;

  update contacts set manual_debt_balance = manual_debt_balance - v_amount
  where id = v_contact_id;
end;
$$;

grant execute on function adjust_contact_debt(uuid, numeric, date, text, uuid) to authenticated;
grant execute on function delete_contact_debt_entry(uuid) to authenticated;
